// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Fixture} from "robinhood-test/utils/Fixture.sol";
import {LevelWeightStrategy} from "../src/LevelWeightStrategy.sol";

contract LevelWeightStrategyTest is Fixture {
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    LevelWeightStrategy levels;

    function setUp() public override {
        super.setUp();
        levels = new LevelWeightStrategy(address(this));
        vault.setStrategy(address(levels));
    }

    function test_DistributePaysByLevel() public {
        uint256 a = _mint(alice);
        uint256 b = _mint(bob);
        levels.setLevel(address(nft), a, 3); // weight 4
        // bob stays level 0 -> weight 1
        _deposit(token, 500);
        vault.distribute(address(token));
        _claimAll(address(token));
        assertEq(token.balanceOf(_tba(a)), 400);
        assertEq(token.balanceOf(_tba(b)), 100);
    }

    function testFuzz_WeightIsOnePlusLevel(uint256 tokenId, uint256 level) public {
        level = bound(level, 0, type(uint256).max - 1);
        levels.setLevel(address(nft), tokenId, level);
        assertEq(levels.weightOf(address(nft), tokenId), 1 + level);
    }

    function test_OnlyOwnerSetsLevel() public {
        vm.prank(alice);
        vm.expectRevert();
        levels.setLevel(address(nft), 1, 1);
    }
}
