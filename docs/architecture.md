# Architecture

Three contracts, one interface, one deploy path. Everything else is tests.

```
                 Factory.deploy(salt, Params)
                          │  cloneDeterministic ×2, initialize ×2, transfer ownership
          ┌───────────────┴────────────────┐
          ▼                                ▼
   MembershipNFT (clone)            RevenueVault (clone)
   ERC-721 + Ownable2Step           Ownable2Step + ReentrancyGuard
          │                                │
   mint() ─┤                               │ weightOf(nft, id) ──▶ IWeightStrategy
          │  registry.createAccount(...)   │                        (Equal / Tenure / yours)
          ▼                                │
   ERC-6551 account per token ◀── claim() pays each share here
          ▲
   owner() resolves through nft.ownerOf(tokenId)
```

## Mint → token-bound account

`MembershipNFT.mint()` is payable. It checks price and supply, mints `tokenId = ++totalSupply` to
the caller, then asks the ERC-6551 **registry** to create an account for `(accountImpl, salt 0,
chainId, nft, tokenId)`. The registry deploys a minimal proxy at an address that is a pure function
of those five values — so `tokenBoundAccount(id)` can be computed before or after the fact and
never changes.

Control of that account is not stored anywhere. The account implementation answers `owner()` by
calling `nft.ownerOf(tokenId)` at that moment. Transfer the NFT and the new holder controls the
wallet; no hook, no sync, nothing to get out of date. The invariant `invariant_TBAControlFollowsNFT`
checks exactly this across random mint/transfer sequences.

Proceeds: `price` goes to `treasury`, the excess back to the minter, both by low-level `call`.
The treasury is probed at `initialize`/`setTreasury` with an empty zero-value call so a contract
that rejects ETH cannot brick minting later. Nothing goes to the vault — rule 1, and a test
(`test_MintProceedsLandAtTreasury_VaultUntouched`) that fails if it ever does.

Tokens are never burned, so ids are exactly `1..totalSupply`; the vault relies on that.

`heldSince[tokenId]` is stamped in `_update` on every mint and transfer. It is the only
strategy-facing state the NFT keeps, and it is what `TenureWeightStrategy` reads.

## Deposit → distribute → claim

Three functions, three phases, each permissionless except where noted:

| Phase        | Who         | What changes                                                                          |
| ------------ | ----------- | ------------------------------------------------------------------------------------- |
| `depositRevenue(token, amount)` | anyone with an approval | `distributable[token] += received` — *received* is the actual balance delta, so fee-on-transfer tokens cannot inflate it. Emits `RevenueDeposited`. |
| `distribute(token)` | anyone | reads `weightOf` for ids `1..totalSupply`, allocates `mulDiv(amount, w_i, Σw)` into `claimable[token][id]`, leaves the remainder in `distributable` (dust). Emits `Allocated` per id and one `Distributed`. Moves no tokens. |
| `claim(token, ids[])` | anyone | for each id, zeroes `claimable` then `safeTransfer`s it to `tokenBoundAccount(id)`. Emits `Claimed`. |

Why allocate and pay separately? Tokenised stocks tend to be transfer-restricted. If payment
happened inside `distribute()`, one blocklisted recipient would revert the round for everyone.
With pull-based claims, that recipient's `claim` reverts and nobody else notices
(`test_BlockedRecipientDoesNotBlockOthers`).

Why is there no `receive()`? So ETH cannot land in the vault by accident, and so there is exactly
one entry point for revenue. `distributable` is credited only in `depositRevenue`.

Zero total weight is a no-op that emits `Distributed(token, 0, 0, amount)` — the deposit waits.
`NothingToDistribute` reverts when `distributable` is `0`.

`distribute()` is O(totalSupply). It is marked in the source: paginate past a few thousand tokens.

The conservation invariant ties it together: over random mints, transfers, weight changes,
deposits, distributions and claims across two reward tokens,
**Σ claimed + Σ claimable + distributable == Σ deposited**, and the vault physically holds every
unclaimed unit.

## Factory → clones

`Factory` is immutable and holds two implementation addresses plus the registry and account
implementation. `deploy(salt, Params)`:

1. derives `nftSalt = keccak256(deployer, salt, "nft")` and `vaultSalt = keccak256(deployer, salt, "vault")` —
   namespaced per deployer, so two projects can both use salt `"membership"`;
2. `Clones.cloneDeterministic` the NFT and the vault (EIP-1167 minimal proxies, ~45 bytes each);
3. `initialize`s both with `msg.sender` as owner;
4. emits `ProjectDeployed(deployer, salt, nft, vault, strategy)`.

`predict(deployer, salt)` returns the same two addresses without deploying. The same
`(deployer, salt)` twice reverts (address already has code). Two projects from the same factory
share bytecode and nothing else — `invariant_ProjectsAreStateIsolated`.

The implementations are deployed once and disabled: their constructors call
`_disableInitializers()`, so nobody can initialize the implementation itself, and clones can be
initialized exactly once. There is no proxy admin, no upgrade path, no `selfdestruct`.

## Events as the read model

Every state change emits: `Minted`, `TreasuryUpdated`, `MintPriceUpdated`, `RevenueDeposited`,
`Distributed`, `Allocated`, `Claimed`, `StrategyUpdated`, `ProjectDeployed`. The front end and
any indexer read these, not storage layouts. The full list with parameters is in
[Contracts](reference/contracts.md).

## Where things live

| Concern                     | File                                              |
| --------------------------- | ------------------------------------------------- |
| Chain constants (VERIFY)    | `contracts/src/Constants.sol`, `apps/web/lib/robinhood.ts` |
| Game logic                  | `contracts/src/strategies/*` — nowhere else       |
| Money math                  | `contracts/src/RevenueVault.sol` — nowhere else   |
| Deploy + local rehearsal    | `contracts/script/Deploy.s.sol`, `DryRun.s.sol`, `dryrun.sh` |
| The spec                    | `contracts/test/**` — see [Testing](reference/testing.md) |
