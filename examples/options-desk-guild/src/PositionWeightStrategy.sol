// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MembershipNFT} from "robinhood/MembershipNFT.sol";
import {IWeightStrategy} from "robinhood/strategies/IWeightStrategy.sol";

/// @notice The one call this strategy needs from an options desk: how much open notional an
///         address is currently underwriting. Implement it as a thin adapter over the real desk.
interface IPositionDesk {
    function openNotionalOf(address account) external view returns (uint256 notional);
}

/// @title PositionWeightStrategy
/// @notice Options-desk-guild example: a membership's weight is the open option notional sitting
///         in its ERC-6551 account. Underwrite more, earn more of the guild's deposited revenue;
///         underwrite nothing and take no share of the round.
/// @dev Reads an external contract, so it is deliberately defensive: a desk that reverts degrades
///      that membership to weight 0 instead of bricking the permissionless `distribute()` for
///      everyone — the same "one bad actor cannot kill the round" shape as the vault's pull-based
///      `claim()`. It cannot defend against a desk that burns all forwarded gas: `desk` is
///      immutable so it can be reviewed once, but point it only at code you have read.
///      The vault is untouched by any of this — weights arrive through `IWeightStrategy` only.
contract PositionWeightStrategy is IWeightStrategy {
    error NotAContract(address account);

    /// @notice The desk whose open notional decides the split. Immutable: no owner can re-point it.
    IPositionDesk public immutable desk;

    constructor(address desk_) {
        if (desk_.code.length == 0) revert NotAContract(desk_);
        desk = IPositionDesk(desk_);
    }

    /// @inheritdoc IWeightStrategy
    /// @dev One external view call per membership per `distribute()`. Keep the desk's
    ///      `openNotionalOf` a stored aggregate, never a loop over positions.
    function weightOf(address nft, uint256 tokenId) external view returns (uint256) {
        address tba = MembershipNFT(nft).tokenBoundAccount(tokenId);
        try desk.openNotionalOf(tba) returns (uint256 notional) {
            return notional;
        } catch {
            return 0;
        }
    }
}
