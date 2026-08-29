# robinhood-app-boilerplate

Chassis for on-chain projects on **Robinhood Chain (chain ID 4663)**: an ERC-721 whose every token
owns an ERC-6551 account, a vault that shares *explicitly deposited* revenue pro-rata by a pluggable
weight strategy, and a factory that clones the pair deterministically. Foundry + optional Next 15.

```bash
npx create-robinhood-app my-idea [--bare | --fullstack] [--with-token]
cd my-idea && pnpm verify
```

## Layout

| Path | What |
|---|---|
| `contracts/src/MembershipNFT.sol` | ERC-721, mints a token-bound account per token, proceeds → treasury |
| `contracts/src/RevenueVault.sol` | `depositRevenue()` → permissionless `distribute()` into each token's TBA |
| `contracts/src/Factory.sol` | `cloneDeterministic` NFT + vault, wired and owned by the caller |
| `contracts/src/strategies/` | `IWeightStrategy`, `EqualWeightStrategy` (default), `TenureWeightStrategy` (reference) |
| `contracts/src/GameToken.sol` | optional plain ERC-20 (`--with-token`), no tax |
| `contracts/script/Deploy.s.sol` | deploys everything, writes `deployments/<chainId>.json` |
| `apps/web` | optional Next 15 + wagmi/viem UI (`--fullstack`), chain 4663 only |
| `CLAUDE.md` | conventions and invariants for humans and agents — read first |

## Commands

```bash
pnpm verify   # forge fmt --check && forge test (&& tsc && lint if apps/web)
pnpm dryrun   # anvil: deploy → mint → deposit → distribute
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast   # ROBINHOOD_RPC_URL in env
```

## Before a real deploy

Every chain-4663 constant (`contracts/src/Constants.sol`, `apps/web/lib/robinhood.ts`, `foundry.toml`)
is `VERIFY`-tagged. Confirm each against official Robinhood Chain docs and the block explorer, then
drop the tag. Also read the legal note at the bottom of `PLAN.md`.
