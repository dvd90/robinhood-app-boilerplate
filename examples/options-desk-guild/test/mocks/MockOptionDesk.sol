// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title MockOptionDesk
/// @notice Stand-in for an on-chain options desk: every open position is an ERC-721 carrying a
///         notional, and `openNotionalOf` aggregates the notional an address currently holds.
/// @dev Test-only. It exists so the strategy can be specified against a real ERC-721 whose
///      accounting follows transfers — no desk protocol is deployed on chain 4663 yet.
contract MockOptionDesk is ERC721 {
    /// @notice Notional of each position id.
    mapping(uint256 positionId => uint256) public notionalOf;
    /// @notice Summed notional of the positions `account` currently holds. Maintained on transfer.
    mapping(address account => uint256) public openNotionalOf;

    uint256 public totalPositions;

    constructor() ERC721("Option Position", "OPT") {}

    /// @dev Plain `_mint`, not `_safeMint`: an ERC-6551 account need not implement IERC721Receiver.
    function open(address to, uint256 notional) external returns (uint256 positionId) {
        positionId = ++totalPositions;
        notionalOf[positionId] = notional;
        _mint(to, positionId);
    }

    /// @notice Expire or exercise a position: it stops counting toward its holder's weight.
    function close(uint256 positionId) external {
        _burn(positionId);
    }

    function _update(address to, uint256 positionId, address auth) internal override returns (address from) {
        from = super._update(to, positionId, auth);
        uint256 notional = notionalOf[positionId];
        if (from != address(0)) openNotionalOf[from] -= notional;
        if (to != address(0)) openNotionalOf[to] += notional;
    }
}
