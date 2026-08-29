// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RevertingOptionDesk
/// @notice A desk that always reverts. Proves a hostile or broken desk cannot brick `distribute()`.
contract RevertingOptionDesk {
    error DeskDown();

    function openNotionalOf(address) external pure returns (uint256) {
        revert DeskDown();
    }
}
