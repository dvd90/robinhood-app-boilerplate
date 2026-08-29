# Deploying

Two targets: a local chain for rehearsal (`anvil`, chain id 31337) and Robinhood Chain (chain id
4663). The same script serves both.

## Local: `pnpm dryrun`

```bash
pnpm dryrun              # blank local chain
pnpm dryrun <rpc-url>    # fork Robinhood Chain state instead (VERIFY the URL first)
```

`contracts/script/dryrun.sh` does, in order:

1. starts `anvil` (killed on exit);
2. runs `Deploy.s.sol` with anvil's account 0 — on chain 31337 it deploys the ERC-6551 registry and
   account implementation itself, because a blank chain has neither;
3. runs `DryRun.s.sol`: mint → deploy a mock reward token → deposit 1000 → distribute → claim,
   and prints what happened;
4. prints `deployments/31337.json`.

`deployments/31337.json` is git-ignored; it is a rehearsal artefact.

## Robinhood Chain: `Deploy.s.sol`

```bash
export ROBINHOOD_RPC_URL=<official RPC URL>          # read by foundry.toml as `--rpc-url robinhood`
export PROJECT_NAME="My Club" PROJECT_SYMBOL="CLUB"   # optional — see the table
cd contracts
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --private-key $DEPLOYER_KEY
```

What it deploys, in one broadcast:

| Step | Contract                                   | Notes                                                             |
| ---- | ------------------------------------------ | ----------------------------------------------------------------- |
| 1    | `MembershipNFT` implementation             | constructor calls `_disableInitializers()`; never used directly   |
| 2    | `RevenueVault` implementation              | same                                                              |
| 3    | `Factory(nftImpl, vaultImpl, registry, accountImpl)` | immutable; holds no powers                                |
| 4    | `EqualWeightStrategy`                      | the default weight                                                |
| 5    | `factory.deploy(SALT, Params{…})`          | clones + initializes NFT and vault, owned by the broadcaster      |

Before step 5 the script checks the registry has code on this chain and reverts with
`RegistryNotDeployed(address)` otherwise — the only guard between you and a wrong constant.

### Environment

All optional; read with `vm.envOr`.

| Variable                | Default                              | Meaning                                                   |
| ----------------------- | ------------------------------------ | --------------------------------------------------------- |
| `PROJECT_NAME`          | `Membership`                         | ERC-721 name                                              |
| `PROJECT_SYMBOL`        | `MBR`                                | ERC-721 symbol                                            |
| `TREASURY`              | broadcaster (`msg.sender`)           | receives mint proceeds; must accept ETH (probed at init)  |
| `MINT_PRICE`            | `10000000000000000` (0.01 ether)     | wei per mint; excess is refunded                          |
| `MAX_SUPPLY`            | `1000`                               | hard cap; `distribute()` is O(supply)                     |
| `SALT`                  | `"membership"` (as `bytes32`)        | clone addresses depend on `(broadcaster, SALT)` only      |
| `ERC6551_REGISTRY`      | `Constants.ERC6551_REGISTRY`         | override the registry — VERIFY                            |
| `ERC6551_ACCOUNT_IMPL`  | `Constants.ERC6551_ACCOUNT_IMPL`     | override the account implementation — VERIFY              |

Predict the addresses before broadcasting: `cast call <factory> "predict(address,bytes32)" <you> <salt>`
— or just deploy; the same `(deployer, SALT)` on the same factory reverts on a second attempt.

### Verifying source

`foundry.toml` has an `[etherscan]` entry named `robinhood` pointing at Blockscout, driven by
`ROBINHOOD_BLOCKSCOUT_API_URL` and `BLOCKSCOUT_API_KEY`. Add `--verify` to the command above
once those are set.

## `deployments/<chainId>.json`

Written by `_writeDeployment` after the broadcast, replacing the file wholesale:

```json
{
  "chainId": 4663,
  "registry": "0x…",
  "accountImpl": "0x…",
  "factory": "0x…",
  "nftImpl": "0x…",
  "vaultImpl": "0x…",
  "equalWeightStrategy": "0x…",
  "nft": "0x…",
  "vault": "0x…"
}
```

`deployments/4663.json` is **tracked** — it is the front end's source of addresses
(`apps/web/lib/robinhood.ts` imports it at build time). The committed placeholder is all zeros with
a `_comment` key that disappears on the first real deploy; commit the real file after deploying.
`apps/web` only reads `nft`, `vault` and `chainId`.

## The VERIFY checklist

Every chain-4663 value in this repo came from project notes, not official sources, and is tagged.
Before the first real broadcast:

- [ ] `contracts/src/Constants.sol` — `CHAIN_ID`, `ERC6551_REGISTRY`, `ERC6551_ACCOUNT_IMPL` confirmed on the Robinhood Chain block explorer (the registry must have code; `cast code <addr> --rpc-url robinhood`)
- [ ] `apps/web/lib/robinhood.ts` — the same two addresses, plus chain name / native currency
- [ ] `foundry.toml` — `ROBINHOOD_RPC_URL`, `ROBINHOOD_BLOCKSCOUT_API_URL` from official docs
- [ ] `apps/web/.env` — `NEXT_PUBLIC_ROBINHOOD_RPC_URL`, `NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL`, `NEXT_PUBLIC_REWARD_TOKENS`
- [ ] `Constants.STOCK_TOKEN_EXAMPLE` and `UNISWAP_ROUTER` are `address(0)` placeholders — fill only from official sources or leave unused
- [ ] Rehearsed with `pnpm dryrun <rpc-url>` against a fork
- [ ] Read the legal note in [Economics & trust](../economics.md#legal-note)

Then delete the `VERIFY` tags — they are the to-do list.
