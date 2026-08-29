# Contracts reference

Every public surface, verbatim from `contracts/src`. Solidity `^0.8.24`, compiled with 0.8.28,
OpenZeppelin 5.x. Custom errors everywhere; no revert strings.

## `MembershipNFT`

`ERC721Upgradeable, Ownable2StepUpgradeable`. Deployed as an EIP-1167 clone; `initialize()` replaces
the constructor. Every token owns an ERC-6551 account. Mint proceeds go to `treasury`, never to a vault.

### Functions

| Signature | Access | Behaviour |
| --- | --- | --- |
| `initialize(string name_, string symbol_, address owner_, address treasury_, uint256 mintPrice_, uint256 maxSupply_, address registry_, address accountImpl_)` | once (`initializer`) | requires `registry_` and `accountImpl_` to have code and `treasury_` to accept ETH |
| `mint() payable → (uint256 tokenId, address tba)` | anyone | next id, `_safeMint`, creates the TBA via the registry, sends `price` to treasury, refunds excess |
| `tokenBoundAccount(uint256 tokenId) view → address` | anyone | deterministic ERC-6551 address (`registry.account(accountImpl, 0, chainid, this, tokenId)`) |
| `setTreasury(address)` | owner | must accept ETH; emits `TreasuryUpdated` |
| `setMintPrice(uint256)` | owner | emits `MintPriceUpdated` |
| `treasury()`, `mintPrice()`, `maxSupply()`, `registry()`, `accountImpl()`, `totalSupply()` | view | public state |
| `heldSince(uint256 tokenId) view → uint256` | view | timestamp the current owner acquired the token; reset on every transfer |
| ERC-721 standard + `Ownable2Step` (`transferOwnership`, `acceptOwnership`, `renounceOwnership`) | — | inherited |

`totalSupply` only grows; ids are exactly `1..totalSupply`.

### Events

```solidity
event Minted(uint256 indexed tokenId, address indexed to, address indexed tba);
event TreasuryUpdated(address indexed treasury);
event MintPriceUpdated(uint256 mintPrice);
```

### Errors

`MaxSupplyReached()`, `InsufficientPayment(uint256 sent, uint256 required)`, `ZeroAddress()`,
`NotAContract(address account)`, `TreasuryNotPayable(address treasury)`, `EthTransferFailed()`.

## `RevenueVault`

`Ownable2StepUpgradeable, ReentrancyGuard`. Pro-rata distribution of explicitly deposited ERC-20
revenue to current holders. No `receive()`. Uses `SafeERC20` and `Math.mulDiv`.

### Functions

| Signature | Access | Behaviour |
| --- | --- | --- |
| `initialize(address owner_, address nft_, address strategy_)` | once | both addresses must have code |
| `depositRevenue(address token, uint256 amount)` | anyone, `nonReentrant` | `safeTransferFrom` caller; credits the actual balance delta; `ZeroAmount` if `amount == 0` |
| `distribute(address token)` | anyone, `nonReentrant` | reads `weightOf` for ids `1..totalSupply`; allocates `mulDiv(amount, w, Σw)` per id into `claimable`; remainder stays in `distributable`; zero Σw → no-op; `NothingToDistribute` if nothing pending |
| `claim(address token, uint256[] tokenIds)` | anyone, `nonReentrant` | zeroes `claimable[token][id]` then `safeTransfer`s it to `nft.tokenBoundAccount(id)`; skips zero balances |
| `setStrategy(address)` | owner | must have code; emits `StrategyUpdated` |
| `nft()`, `strategy()` | view | wired contracts |
| `distributable(address token) view → uint256` | view | deposited-but-undistributed (includes carried dust) |
| `claimable(address token, uint256 tokenId) view → uint256` | view | allocated-but-unclaimed |

### Events

```solidity
event RevenueDeposited(address indexed token, address indexed from, uint256 amount);
event Distributed(address indexed token, uint256 amount, uint256 totalWeight, uint256 carried);
event Allocated(address indexed token, uint256 indexed tokenId, uint256 amount);
event Claimed(address indexed token, uint256 indexed tokenId, address indexed tba, uint256 amount);
event StrategyUpdated(address indexed strategy);
```

### Errors

`ZeroAddress()`, `NotAContract(address account)`, `ZeroAmount()`, `NothingToDistribute()`.

## `Factory`

Immutable. Deploys a `MembershipNFT` + `RevenueVault` pair as deterministic EIP-1167 clones, wired
and owned by the caller in one transaction. Holds no powers over anything it deploys.

```solidity
struct Params {
    string name;
    string symbol;
    address treasury;
    uint256 mintPrice;
    uint256 maxSupply;
    address strategy;
}
```

| Signature | Behaviour |
| --- | --- |
| `constructor(address nftImpl_, address vaultImpl_, address registry_, address accountImpl_)` | all non-zero or `ZeroAddress()` |
| `deploy(bytes32 salt, Params p) → (address nft, address vault)` | clones at `keccak256(msg.sender, salt, "nft"/"vault")`, initializes both with `msg.sender` as owner, emits `ProjectDeployed` |
| `predict(address deployer, bytes32 salt) view → (address nft, address vault)` | the addresses `deploy` would produce for that deployer |
| `nftImpl()`, `vaultImpl()`, `registry()`, `accountImpl()` | immutables |

```solidity
event ProjectDeployed(address indexed deployer, bytes32 indexed salt, address nft, address vault, address strategy);
```

Same `(deployer, salt)` twice reverts (target already has code). Different deployers with the same
salt never collide.

## `IWeightStrategy`

```solidity
interface IWeightStrategy {
    function weightOf(address nft, uint256 tokenId) external view returns (uint256 weight);
}
```

The vault's only game-facing dependency. See [Weight strategies](../guides/weight-strategies.md).

### `EqualWeightStrategy`

`weightOf(address, uint256) pure → 1`. The default.

### `TenureWeightStrategy`

`constructor(uint256 period_)` — reverts `ZeroPeriod()` on `0`. `period()` is immutable.
`weightOf(nft, tokenId) view → 1 + (block.timestamp − MembershipNFT(nft).heldSince(tokenId)) / period`.

## `GameToken` (optional, `--with-token`)

`ERC20`. `constructor(string name_, string symbol_, uint256 supply, address recipient)` mints the
whole supply once to `recipient`. No tax, no hooks, no vault wiring — a plain token you may use as a
reward token or in-game currency. Tested to have no transfer tax (`testFuzz_TransferHasNoTax`).

## `Constants` (library)

The single source of chain-4663 constants; mirrored by `apps/web/lib/robinhood.ts`. **Every value is
`VERIFY`-tagged** until confirmed against official Robinhood Chain docs and the explorer.

| Constant | Value in repo | Status |
| --- | --- | --- |
| `CHAIN_ID` | `4663` | VERIFY |
| `ERC6551_REGISTRY` | `0x000000006551c19487814612e58FE06813775758` (canonical registry address) | VERIFY it is deployed on 4663 |
| `ERC6551_ACCOUNT_IMPL` | `0x41C8f39463A868d3A88af00cd0fe7102F30E44eC` (Tokenbound AccountV3) | VERIFY it is deployed on 4663 |
| `STOCK_TOKEN_EXAMPLE` | `address(0)` | placeholder |
| `UNISWAP_ROUTER` | `address(0)` | placeholder |

## Deploy scripts

`Deploy.s.sol` — `run()` deploys implementations + `Factory` + `EqualWeightStrategy` and one project,
writes `deployments/<chainId>.json`. `deployCore(address registry, address accountImpl) public → (Factory, EqualWeightStrategy)`
is reusable (the integration tests and the Arcade Guild example call it). Reverts
`RegistryNotDeployed(address)` when the registry has no code. On chain 31337 it deploys the ERC-6551
pieces itself.

`DryRun.s.sol` — reads `deployments/<chainId>.json`, mints, deploys a `MockRewardToken`, deposits
`1000e18`, distributes, claims, logs the TBA balance and carried dust. Anvil only.
