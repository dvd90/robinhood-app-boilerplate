# Configuration

Nothing is required to compile, test or dry-run. Everything below is for a real chain or the
front end. There is no `.env` loader in the contracts — export variables in your shell (or use
`direnv`); `apps/web` reads its own `.env`.

## Deploy script (`contracts/script/Deploy.s.sol`)

Read with `vm.envOr`, so every one is optional.

| Variable                | Type      | Default                          | Meaning                                                          |
| ----------------------- | --------- | -------------------------------- | ---------------------------------------------------------------- |
| `PROJECT_NAME`          | string    | `Membership`                     | ERC-721 name                                                     |
| `PROJECT_SYMBOL`        | string    | `MBR`                            | ERC-721 symbol                                                   |
| `TREASURY`              | address   | the broadcaster                  | receives mint proceeds; must accept a zero-value call             |
| `MINT_PRICE`            | uint (wei)| `10000000000000000` (0.01 ether) | price per mint; excess refunded                                  |
| `MAX_SUPPLY`            | uint      | `1000`                           | hard cap on memberships                                          |
| `SALT`                  | bytes32   | `"membership"`                   | clone addresses depend on `(broadcaster, SALT)`                  |
| `ERC6551_REGISTRY`      | address   | `Constants.ERC6551_REGISTRY`     | VERIFY — override without editing code                           |
| `ERC6551_ACCOUNT_IMPL`  | address   | `Constants.ERC6551_ACCOUNT_IMPL` | VERIFY — override without editing code                           |

Plus the standard forge flags: `--private-key` / `--account` / `--ledger` for the broadcaster,
`--rpc-url robinhood` (below), `--verify`.

## Foundry (`contracts/foundry.toml`)

```toml
[rpc_endpoints]
robinhood = "${ROBINHOOD_RPC_URL}"                    # VERIFY: from official Robinhood Chain docs

[etherscan]
robinhood = { key = "${BLOCKSCOUT_API_KEY}", chain = 4663, url = "${ROBINHOOD_BLOCKSCOUT_API_URL}" }
```

| Variable                        | Used by                                   |
| ------------------------------- | ----------------------------------------- |
| `ROBINHOOD_RPC_URL`             | `--rpc-url robinhood`                     |
| `ROBINHOOD_BLOCKSCOUT_API_URL`  | `--verify` (Blockscout API base URL)      |
| `BLOCKSCOUT_API_KEY`            | `--verify` (may be empty for Blockscout)  |
| `FOUNDRY_PROFILE`               | `ci` for the deeper fuzz/invariant runs   |

### Profiles

| Setting               | `default` | `ci`   |
| --------------------- | --------- | ------ |
| `fuzz.runs`           | 512       | 2048   |
| `invariant.runs`      | 64        | 256    |
| `invariant.depth`     | 32        | 64     |
| `invariant.fail_on_revert` | true | true   |
| `solc_version`        | 0.8.28    | —      |
| `optimizer_runs`      | 200       | —      |

`fs_permissions` grants read-write on `../deployments` so `Deploy.s.sol` can write
`deployments/<chainId>.json`. The directory must already exist (it ships with `.gitkeep`) — Foundry
refuses to create directories outside the project root.

## Front end (`apps/web/.env.example`)

```
NEXT_PUBLIC_ROBINHOOD_RPC_URL=
NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL=
NEXT_PUBLIC_REWARD_TOKENS=
```

| Variable                             | Meaning                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL`      | RPC for chain 4663 — VERIFY                                                 |
| `NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL` | Blockscout base URL for links — VERIFY                                      |
| `NEXT_PUBLIC_REWARD_TOKENS`          | comma-separated ERC-20 addresses to show in Holdings/Distribute; entries that are not `0x` + 40 hex are dropped |

All three are read only in `apps/web/lib/robinhood.ts`. Contract addresses are **not** env vars: they
come from `deployments/4663.json` at build time.

## Chain constants (not env, VERIFY-tagged)

| File                              | Holds                                                     |
| --------------------------------- | --------------------------------------------------------- |
| `contracts/src/Constants.sol`     | `CHAIN_ID`, `ERC6551_REGISTRY`, `ERC6551_ACCOUNT_IMPL`, placeholders |
| `apps/web/lib/robinhood.ts`       | the same, plus `robinhoodChain` (name, currency, URLs from env) |

Rule 4: no other file may hold an address literal. Both files carry `VERIFY` comments to delete once
each value is confirmed against official docs and the explorer.

## pnpm (`pnpm-workspace.yaml`)

`packages: ["apps/*"]` — the workspace holds only the front end. `allowBuilds` lists native
optional dependencies (`bufferutil`, `keccak`, `unrs-resolver`, `utf-8-validate`) as `false`: they
have pure-JS fallbacks and pnpm ≥ 10 would otherwise refuse to install with a hard error.
