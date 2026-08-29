// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {MembershipNFT} from "./MembershipNFT.sol";
import {IWeightStrategy} from "./strategies/IWeightStrategy.sol";

/// @title RevenueVault
/// @notice Pro-rata distribution of explicitly deposited ERC-20 revenue to current NFT holders,
///         paid into each token's ERC-6551 account. Weights come only from `IWeightStrategy`.
/// @dev Distributes ONLY what arrives via `depositRevenue()` (CLAUDE.md rule 1). There is no
///      `receive()`: ETH and mint proceeds cannot land here. Division dust carries forward.
contract RevenueVault is Ownable2StepUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error ZeroAmount();
    error NothingToDistribute();

    event RevenueDeposited(address indexed token, address indexed from, uint256 amount);
    event Paid(address indexed token, uint256 indexed tokenId, address indexed tba, uint256 amount);
    event Distributed(address indexed token, uint256 amount, uint256 totalWeight, uint256 carried);
    event StrategyUpdated(address indexed strategy);

    MembershipNFT public nft;
    IWeightStrategy public strategy;
    /// @notice Deposited-but-undistributed balance per reward token (includes carried dust).
    mapping(address token => uint256) public distributable;

    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_, address nft_, address strategy_) external initializer {
        if (nft_ == address(0) || strategy_ == address(0)) revert ZeroAddress();
        __Ownable_init(owner_);
        __Ownable2Step_init();
        nft = MembershipNFT(nft_);
        strategy = IWeightStrategy(strategy_);
    }

    /// @notice Deposit `amount` of `token` for the next distribution round. Caller must approve first.
    /// @dev Credits what actually arrived, so fee-on-transfer tokens cannot inflate accounting.
    function depositRevenue(address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        distributable[token] += received;
        emit RevenueDeposited(token, msg.sender, received);
    }

    /// @notice Permissionless. Splits `distributable[token]` across all current holders by weight.
    ///         With zero total weight the round is a no-op and funds wait for the next one.
    // ponytail: O(totalSupply) per call; paginate if maxSupply grows past a few thousand.
    function distribute(address token) external nonReentrant {
        uint256 amount = distributable[token];
        if (amount == 0) revert NothingToDistribute();

        uint256 supply = nft.totalSupply();
        uint256[] memory weights = new uint256[](supply);
        uint256 totalWeight;
        for (uint256 i; i < supply; i++) {
            weights[i] = strategy.weightOf(address(nft), i + 1);
            totalWeight += weights[i];
        }
        if (totalWeight == 0) {
            emit Distributed(token, 0, 0, amount);
            return;
        }

        uint256[] memory shares = new uint256[](supply);
        uint256 paid;
        for (uint256 i; i < supply; i++) {
            shares[i] = Math.mulDiv(amount, weights[i], totalWeight);
            paid += shares[i];
        }

        // Effects before interactions; the remainder (dust) stays for the next round.
        distributable[token] = amount - paid;
        emit Distributed(token, paid, totalWeight, amount - paid);

        for (uint256 i; i < supply; i++) {
            if (shares[i] == 0) continue;
            address tba = nft.tokenBoundAccount(i + 1);
            IERC20(token).safeTransfer(tba, shares[i]);
            emit Paid(token, i + 1, tba, shares[i]);
        }
    }

    function setStrategy(address strategy_) external onlyOwner {
        if (strategy_ == address(0)) revert ZeroAddress();
        strategy = IWeightStrategy(strategy_);
        emit StrategyUpdated(strategy_);
    }
}
