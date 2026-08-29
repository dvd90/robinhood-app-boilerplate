// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWeightStrategy} from "robinhood/strategies/IWeightStrategy.sol";

/// @title LevelWeightStrategy
/// @notice Arcade-guild example: weight = 1 + level. Levels are set by the guild owner (game server).
contract LevelWeightStrategy is IWeightStrategy, Ownable {
    event LevelSet(address indexed nft, uint256 indexed tokenId, uint256 level);

    mapping(address nft => mapping(uint256 tokenId => uint256)) public levelOf;

    constructor(address owner_) Ownable(owner_) {}

    function setLevel(address nft, uint256 tokenId, uint256 level) external onlyOwner {
        levelOf[nft][tokenId] = level;
        emit LevelSet(nft, tokenId, level);
    }

    function weightOf(address nft, uint256 tokenId) external view returns (uint256) {
        return 1 + levelOf[nft][tokenId];
    }
}
