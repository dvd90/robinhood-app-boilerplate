# Getting started

From nothing to a project you can deploy, in five steps. Every step has one block to
copy-paste and shows what you should see. Total time: about 10 minutes.

Words you will meet, once, right here:

- **NFT** — a token with a unique id. Here it is a *membership card*.
- **Token-bound account (TBA, ERC-6551)** — a wallet that belongs to an NFT. Whoever holds the card controls the wallet. Sell the card, the wallet goes with it.
- **Vault** — the contract that receives revenue and splits it across every card, paying each share into that card's wallet.
- **Weight** — how big a card's share is. You decide the rule; the vault only asks for a number.

The long version, with pictures and a worked example: [Tutorial](tutorial.md).

## Step 1 — Install the tools

You need [Foundry](https://getfoundry.sh) (compiles and tests the contracts, runs a local chain), Node.js 20 or newer, and pnpm.

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup   # installs forge, anvil, cast
npm install -g pnpm                                         # if you don't have it
forge --version && anvil --version && node -v && pnpm -v
```

You should see four version lines, for example:

```
forge Version: 1.8.1
anvil Version: 1.8.1
v22.12.0
11.0.0
```

> **Stuck?** `forge: command not found` after installing → Foundry lives in `~/.foundry/bin`. Run
> `export PATH="$HOME/.foundry/bin:$PATH"` (and add it to your shell profile).

## Step 2 — Create a project

```bash
npx create-robinhood-app my-app
```

Want a website too? Add `--fullstack`. Want the optional ERC-20 game token? Add `--with-token`. Both are
explained in [CLI & scripts](reference/cli.md). No flags is the smallest, fastest start — you can always
add the front end later.

You should see:

```
Done. Next:
  cd my-app
  pnpm verify        # forge fmt --check && forge test
  pnpm dryrun        # anvil: deploy → mint → deposit → distribute

Read CLAUDE.md before changing anything. Every chain-4663 address is VERIFY-tagged: confirm
them against official Robinhood Chain docs + explorer before a real deploy.
```

What just happened: the CLI cloned the template, removed everything that is not your project (the CLI
itself, the build plan, the example), renamed it, and made a first git commit. No prompts — it is safe
to run from a script or an AI agent.

## Step 3 — Run the tests

```bash
cd my-app
pnpm verify
```

You should see every suite end in `ok` and a final line like:

```
Ran 9 test suites in 0.6s: 54 tests passed, 0 failed, 0 skipped (54 total tests)
```

(The exact count depends on your flags; `--with-token` adds two tests.) `pnpm verify` is the *gate*:
formatting, unit tests, fuzz tests and invariant tests. CI runs exactly this, so green here means green there.

What just happened: among those tests, two invariants ran hundreds of random sequences of mints,
transfers, deposits and distributions and checked that (a) nothing is ever minted or lost by the vault
and (b) a card's wallet always answers to the card's current owner. Those two are the reason you can
trust the rest.

## Step 4 — See it work locally

```bash
pnpm dryrun
```

This starts a local chain (`anvil`), deploys every contract, mints one membership, deposits 1000 reward
tokens into the vault, distributes them, and pays the share into the membership's wallet.

You should see, at the end:

```
  minted tokenId 1 tba 0x590779afeD62ecEDF9a7480bD297CA97d1F80Cd8
  tba reward balance 1000000000000000000000
  vault carried dust 0
{
  "chainId": 31337,
  "factory": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  "nft": "0x6591BC932234ae32A2bE0C2494e1A01BEC010Fce",
  "vault": "0x2F3409425e0228aDA6352B9c0DF5BCe25E967D5A",
  ...
}
```

In plain words, line by line:

1. **A member joined.** Card #1 was minted and got its own wallet (the `tba` address).
2. **Revenue came in and was split.** 1000 tokens were deposited; there is one card, so it earned all of them: `1000000000000000000000` is 1000 × 10¹⁸ (tokens have 18 decimals).
3. **Nothing was lost.** `carried dust 0` — when a split does not divide evenly, the remainder stays in the vault for the next round instead of disappearing.
4. **Addresses.** The JSON is `deployments/31337.json`; a real deploy writes `deployments/4663.json`, and the front end reads it.

> **Stuck?** `Address already in use` → another anvil is running: `pkill anvil` and retry.

## Step 5 — Make it yours

Three things make a project yours: the *rule* for splitting revenue, the *name and price*, and the *chain*.

**The rule.** Create `contracts/src/strategies/LevelWeightStrategy.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IWeightStrategy} from "./IWeightStrategy.sol";

/// Weight = 1 + level. Level 3 earns 4× what level 0 earns.
contract LevelWeightStrategy is IWeightStrategy {
    mapping(uint256 tokenId => uint256) public level;

    function setLevel(uint256 tokenId, uint256 newLevel) external {
        level[tokenId] = newLevel; // add access control before shipping — see the guide
    }

    function weightOf(address, uint256 tokenId) external view returns (uint256) {
        return 1 + level[tokenId];
    }
}
```

That is the whole game surface. The vault calls `weightOf()` for every card at distribution time and
never learns what a level is. Write a test first (copy `contracts/test/strategies/TenureWeightStrategy.t.sol`),
then `pnpm verify`. Full guide: [Weight strategies](guides/weight-strategies.md).

**Name and price.** `Deploy.s.sol` reads them from your shell — nothing to edit:

```bash
export PROJECT_NAME="My Club" PROJECT_SYMBOL="CLUB" MINT_PRICE=20000000000000000 MAX_SUPPLY=500
```

**The chain.** For a local rehearsal, `pnpm dryrun` already used these. For Robinhood Chain:

```bash
export ROBINHOOD_RPC_URL=<official RPC URL>
cd contracts
forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --private-key $DEPLOYER_KEY
```

> **STOP — VERIFY first.** Every chain-4663 address in `contracts/src/Constants.sol` (the ERC-6551
> registry and account implementation) comes from project notes and is tagged `// VERIFY:`. Confirm
> each against the official Robinhood Chain docs and the block explorer *before* broadcasting. A wrong
> address does not revert — it silently creates wallets nobody controls. Checklist: [Deploying](guides/deploying.md).

You should see `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.` and a new `deployments/4663.json`.

## Stuck?

| Symptom                                                        | Fix                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `forge: command not found`                                     | `export PATH="$HOME/.foundry/bin:$PATH"`                                              |
| `pnpm verify` fails on `forge fmt --check` only                | run `forge fmt` twice in `contracts/` (it is not idempotent on long multi-line `if`s), then retry |
| `Address already in use` from `pnpm dryrun`                    | `pkill anvil`                                                                          |
| `ERR_PNPM_...` about ignored build scripts (`--fullstack`)     | already handled in `pnpm-workspace.yaml` (`allowBuilds`); make sure you are on pnpm ≥ 10 |
| `RegistryNotDeployed(0x…)` on a real chain                     | the ERC-6551 registry address is wrong for this chain — VERIFY it, or override `ERC6551_REGISTRY` |
| `failed to open file ../deployments/…`                         | the `deployments/` directory must exist (it ships with a `.gitkeep`); do not delete it |

## Where to go next

- [Weight strategies](guides/weight-strategies.md) — make the split rule real, with access control and tests
- [Example: Arcade Guild](guides/example-arcade-guild.md) — a finished project built on the boilerplate
- [Deploying](guides/deploying.md) — the full checklist for chain 4663
- [Front end](guides/frontend.md) — if you scaffolded with `--fullstack`
- [Economics & trust](economics.md) — what holders can rely on, what the owner can and cannot do
