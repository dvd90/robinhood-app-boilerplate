// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Fixture} from "robinhood-test/utils/Fixture.sol";
import {PositionWeightStrategy} from "../src/PositionWeightStrategy.sol";
import {MockOptionDesk} from "./mocks/MockOptionDesk.sol";
import {RevertingOptionDesk} from "./mocks/RevertingOptionDesk.sol";

/// The spec for weighting memberships by the option notional sitting in their token-bound account.
contract PositionWeightStrategyTest is Fixture {
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    MockOptionDesk desk;
    PositionWeightStrategy positions;

    function setUp() public override {
        super.setUp();
        desk = new MockOptionDesk();
        positions = new PositionWeightStrategy(address(desk));
        vault.setStrategy(address(positions));
    }

    /// Move a position out of a membership's TBA, signed by the membership's owner.
    function _sendPositionFromTba(uint256 tokenId, address to, uint256 positionId) internal {
        address tba = _tba(tokenId);
        vm.prank(nft.ownerOf(tokenId));
        (bool ok,) = tba.call(
            abi.encodeWithSignature(
                "execute(address,uint256,bytes,uint8)",
                address(desk),
                0,
                abi.encodeCall(IERC721.transferFrom, (tba, to, positionId)),
                uint8(0)
            )
        );
        assertTrue(ok, "tba execute failed");
    }

    // --- weightOf -----------------------------------------------------------

    function test_WeightIsOpenNotionalHeldByTheTba() public {
        uint256 a = _mint(alice);
        desk.open(_tba(a), 300);
        desk.open(_tba(a), 700);
        assertEq(positions.weightOf(address(nft), a), 1000);
    }

    function test_NotionalHeldByTheOwnerNotTheTbaDoesNotCount() public {
        uint256 a = _mint(alice);
        desk.open(alice, 1000); // in her own wallet, not the membership's
        assertEq(positions.weightOf(address(nft), a), 0);
    }

    function test_ClosedPositionStopsCounting() public {
        uint256 a = _mint(alice);
        uint256 p = desk.open(_tba(a), 1000);
        desk.close(p);
        assertEq(positions.weightOf(address(nft), a), 0);
    }

    function test_ConstructorRejectsNonContractDesk() public {
        vm.expectRevert(abi.encodeWithSelector(PositionWeightStrategy.NotAContract.selector, alice));
        new PositionWeightStrategy(alice);
    }

    // --- distribute ---------------------------------------------------------

    function test_DistributePaysByOpenNotional() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        desk.open(_tba(a), 750);
        desk.open(_tba(b), 250);

        _deposit(token, 1000);
        vault.distribute(address(token));
        _claimAll(address(token));

        assertEq(token.balanceOf(_tba(a)), 750);
        assertEq(token.balanceOf(_tba(b)), 250);
    }

    function test_MemberWithNoOpenPositionsEarnsNothingThisRound() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        desk.open(_tba(a), 1000);
        // bob underwrote nothing.

        _deposit(token, 500);
        vault.distribute(address(token));
        _claimAll(address(token));

        assertEq(token.balanceOf(_tba(a)), 500);
        assertEq(token.balanceOf(_tba(b)), 0);
    }

    /// Nobody underwriting => the round is a no-op and the deposit waits for the next one.
    function test_NoOpenPositionsAnywhereLeavesTheDepositDistributable() public {
        _mint(alice);
        _mint(bob);

        _deposit(token, 500);
        vault.distribute(address(token));

        assertEq(vault.distributable(address(token)), 500);
        assertEq(token.balanceOf(address(vault)), 500);
    }

    /// The point of the TBA: sell the membership and the open options go with it.
    function test_PositionsFollowTheMembership() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        desk.open(_tba(a), 1000);
        desk.open(_tba(b), 1000);

        vm.prank(alice);
        nft.transferFrom(alice, carol, a);

        // The notional never moved — it is still in the TBA, which carol now controls.
        assertEq(desk.openNotionalOf(_tba(a)), 1000);
        assertEq(positions.weightOf(address(nft), a), 1000);

        _deposit(token, 1000);
        vault.distribute(address(token));
        _claimAll(address(token));

        assertEq(token.balanceOf(_tba(a)), 500);
        assertEq(nft.ownerOf(a), carol);
    }

    /// ...and taking the position out of the TBA takes the weight with it.
    function test_WithdrawingAPositionDropsTheWeight() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        uint256 p = desk.open(_tba(a), 1000);
        desk.open(_tba(b), 1000);

        _sendPositionFromTba(a, alice, p);
        assertEq(positions.weightOf(address(nft), a), 0);

        _deposit(token, 1000);
        vault.distribute(address(token));
        _claimAll(address(token));

        assertEq(token.balanceOf(_tba(a)), 0);
        assertEq(token.balanceOf(_tba(b)), 1000);
    }

    /// A broken or hostile desk must not take the whole round down with it.
    function test_RevertingDeskDegradesToZeroWeightAndDoesNotBrickDistribute() public {
        PositionWeightStrategy broken = new PositionWeightStrategy(address(new RevertingOptionDesk()));
        vault.setStrategy(address(broken));
        uint256 a = _mint(alice);

        assertEq(broken.weightOf(address(nft), a), 0);

        _deposit(token, 500);
        vault.distribute(address(token)); // no revert; nothing allocated
        assertEq(vault.distributable(address(token)), 500);
    }

    // --- fuzz ---------------------------------------------------------------

    function testFuzz_WeightEqualsDeskNotionalForTheTba(uint256 notionalA, uint256 notionalB) public {
        notionalA = bound(notionalA, 0, type(uint128).max);
        notionalB = bound(notionalB, 0, type(uint128).max);
        uint256 a = _mint(alice);
        if (notionalA > 0) desk.open(_tba(a), notionalA);
        if (notionalB > 0) desk.open(_tba(a), notionalB);

        assertEq(positions.weightOf(address(nft), a), notionalA + notionalB);
        assertEq(positions.weightOf(address(nft), a), desk.openNotionalOf(_tba(a)));
    }

    /// Conservation still holds when weights come from an external contract.
    function testFuzz_DistributeConservesTheDeposit(uint256 notionalA, uint256 notionalB, uint256 amount) public {
        notionalA = bound(notionalA, 1, type(uint96).max);
        notionalB = bound(notionalB, 1, type(uint96).max);
        amount = bound(amount, 1, type(uint96).max);

        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        desk.open(_tba(a), notionalA);
        desk.open(_tba(b), notionalB);

        _deposit(token, amount);
        vault.distribute(address(token));
        _claimAll(address(token));

        uint256 paid = token.balanceOf(_tba(a)) + token.balanceOf(_tba(b));
        assertEq(paid + vault.distributable(address(token)), amount);
        assertEq(token.balanceOf(address(vault)), vault.distributable(address(token)));
    }
}
