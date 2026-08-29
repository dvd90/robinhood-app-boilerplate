// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixture} from "./utils/Fixture.sol";
import {RevenueVault} from "../src/RevenueVault.sol";
import {MockRewardToken} from "./mocks/MockRewardToken.sol";
import {MockWeightStrategy} from "./mocks/MockWeightStrategy.sol";
import {ReenteringToken} from "./mocks/ReenteringToken.sol";

contract RevenueVaultTest is Fixture {
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    function test_DepositIncreasesDistributable() public {
        _deposit(token, 500);
        assertEq(vault.distributable(address(token)), 500);
        assertEq(token.balanceOf(address(vault)), 500);
        _deposit(token, 100);
        assertEq(vault.distributable(address(token)), 600);
    }

    function test_DepositZeroReverts() public {
        vm.expectRevert(RevenueVault.ZeroAmount.selector);
        vault.depositRevenue(address(token), 0);
    }

    function test_DistributeSplitsProRataByWeight() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        uint256 c = _mint(carol);
        strategy.setWeight(a, 1);
        strategy.setWeight(b, 2);
        strategy.setWeight(c, 3);
        _deposit(token, 600);

        vault.distribute(address(token));

        assertEq(token.balanceOf(_tba(a)), 100);
        assertEq(token.balanceOf(_tba(b)), 200);
        assertEq(token.balanceOf(_tba(c)), 300);
        assertEq(vault.distributable(address(token)), 0);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function test_DistributeIsPermissionless() public {
        uint256 a = _mint(alice);
        _deposit(token, 100);
        vm.prank(makeAddr("anyone"));
        vault.distribute(address(token));
        assertEq(token.balanceOf(_tba(a)), 100);
    }

    function test_DustCarriesForward() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        uint256 c = _mint(carol);
        _deposit(token, 100);
        vault.distribute(address(token));
        assertEq(token.balanceOf(_tba(a)), 33);
        assertEq(token.balanceOf(_tba(b)), 33);
        assertEq(token.balanceOf(_tba(c)), 33);
        assertEq(vault.distributable(address(token)), 1, "dust not carried");

        _deposit(token, 2);
        vault.distribute(address(token));
        assertEq(token.balanceOf(_tba(a)), 34);
        assertEq(token.balanceOf(_tba(b)), 34);
        assertEq(token.balanceOf(_tba(c)), 34);
        assertEq(vault.distributable(address(token)), 0);
    }

    function test_ZeroHoldersKeepsFunds() public {
        _deposit(token, 100);
        vault.distribute(address(token));
        assertEq(vault.distributable(address(token)), 100);
        assertEq(token.balanceOf(address(vault)), 100);

        uint256 a = _mint(alice);
        vault.distribute(address(token));
        assertEq(token.balanceOf(_tba(a)), 100);
    }

    function test_ZeroTotalWeightKeepsFunds() public {
        _mint(alice);
        strategy.setDefaultWeight(0);
        _deposit(token, 100);
        vault.distribute(address(token));
        assertEq(vault.distributable(address(token)), 100);
    }

    function test_NothingToDistributeReverts() public {
        _mint(alice);
        vm.expectRevert(RevenueVault.NothingToDistribute.selector);
        vault.distribute(address(token));
    }

    function test_MultipleTokensIndependent() public {
        MockRewardToken other = new MockRewardToken();
        uint256 a = _mint(alice);
        _deposit(token, 100);
        _deposit(other, 40);

        vault.distribute(address(token));
        assertEq(token.balanceOf(_tba(a)), 100);
        assertEq(other.balanceOf(_tba(a)), 0);
        assertEq(vault.distributable(address(other)), 40);

        vault.distribute(address(other));
        assertEq(other.balanceOf(_tba(a)), 40);
    }

    function test_WeightReadOnlyViaStrategy() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        MockWeightStrategy other = new MockWeightStrategy();
        other.setWeight(a, 3);
        other.setWeight(b, 1);

        vm.prank(alice);
        vm.expectRevert();
        vault.setStrategy(address(other));

        vault.setStrategy(address(other));
        _deposit(token, 400);
        vault.distribute(address(token));
        assertEq(token.balanceOf(_tba(a)), 300);
        assertEq(token.balanceOf(_tba(b)), 100);
    }

    function test_ReentrancyGuardHolds() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        ReenteringToken evil = new ReenteringToken();
        evil.setVault(vault);
        evil.mint(address(this), 100);
        evil.approve(address(vault), 100);
        vault.depositRevenue(address(evil), 100);

        vault.distribute(address(evil));

        assertEq(evil.reentryAttempts(), 2);
        assertEq(evil.reentrySuccesses(), 0, "reentered");
        assertEq(evil.balanceOf(_tba(a)), 50);
        assertEq(evil.balanceOf(_tba(b)), 50);
        assertEq(evil.balanceOf(address(vault)), 0);
    }

    /// CLAUDE.md rule 1 with the real vault: minting never moves value into it.
    function test_MintNeverTouchesVault() public {
        _mint(alice);
        _mint(bob);
        assertEq(address(vault).balance, 0);
        assertEq(token.balanceOf(address(vault)), 0);
        assertEq(treasury.balance, 2 * PRICE);
    }

    function test_CannotReinitialize() public {
        vm.expectRevert();
        vault.initialize(address(this), address(nft), address(strategy));
    }

    function test_EmitsEvents() public {
        uint256 a = _mint(alice);
        token.mint(address(this), 10);
        token.approve(address(vault), 10);
        vm.expectEmit(true, true, true, true);
        emit RevenueVault.RevenueDeposited(address(token), address(this), 10);
        vault.depositRevenue(address(token), 10);

        vm.expectEmit(true, true, true, true);
        emit RevenueVault.Distributed(address(token), 10, 1, 0);
        vm.expectEmit(true, true, true, true);
        emit RevenueVault.Paid(address(token), a, _tba(a), 10);
        vault.distribute(address(token));
    }

    /// No holder receives more than its weighted share; dust < totalWeight; nothing lost.
    function testFuzz_NoHolderExceedsWeightedShare(uint128 amount, uint32 w1, uint32 w2, uint32 w3) public {
        vm.assume(amount > 0 && uint256(w1) + w2 + w3 > 0);
        uint256[3] memory ids = [_mint(alice), _mint(bob), _mint(carol)];
        uint32[3] memory w = [w1, w2, w3];
        uint256 totalW;
        for (uint256 i; i < 3; i++) {
            strategy.setWeight(ids[i], w[i]);
            totalW += w[i];
        }
        _deposit(token, amount);
        vault.distribute(address(token));

        uint256 paid;
        for (uint256 i; i < 3; i++) {
            uint256 got = token.balanceOf(_tba(ids[i]));
            assertLe(got, uint256(amount) * w[i] / totalW, "over weighted share");
            paid += got;
        }
        uint256 dust = vault.distributable(address(token));
        assertEq(paid + dust, amount, "conservation");
        assertLt(dust, totalW, "dust too large");
    }
}
