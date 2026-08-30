# 🪙 Robinhood App Boilerplate

**Membership NFTs that own wallets, a vault that shares revenue with them, and a factory that clones the pair — for Robinhood Chain. Scaffold, test, ship.**

**[📖 Documentation](https://dvd90.github.io/robinhood-app-boilerplate/)** · [Start here](docs/getting-started.md) · [create-robinhood-app on npm](https://www.npmjs.com/package/create-robinhood-app)

## Start here

Five commands, about ten minutes. Each is explained step by step in the **[getting-started guide](docs/getting-started.md)**.

1. **Install the tools** — `curl -L https://foundry.paradigm.xyz | bash && foundryup`, Node ≥ 20, `npm i -g pnpm`
2. **Create a project** — `npx create-robinhood-app my-app` (add `--fullstack` for a website)
3. **Run the tests** — `cd my-app && pnpm verify`
4. **See it work locally** — `pnpm dryrun` (deploys, mints, deposits, distributes on a local chain)
5. **Make it yours** — write a 10-line weight strategy, then deploy with `forge script script/Deploy.s.sol --rpc-url robinhood --broadcast`

Every project you scaffold is a Foundry monorepo pre-wired to **Robinhood Chain (chain id 4663)**. It ships three small contracts: **MembershipNFT** — an ERC-721 where every token owns an [ERC-6551](https://eips.ethereum.org/EIPS/eip-6551) token-bound account (a wallet controlled by whoever holds the NFT); **RevenueVault** — splits ERC-20 revenue that was *explicitly deposited* across current holders, pro-rata by a pluggable weight, and pays each share into that token's wallet; and **Factory** — deterministic EIP-1167 clones of the pair, wired and owned by you in one transaction. Optional extras behind CLI flags: a Next 15 + wagmi/viem front end and a plain ERC-20 game token.

Your game logic is one function:

```solidity
contract LevelWeightStrategy is IWeightStrategy {
    mapping(uint256 tokenId => uint256) public level;

    function weightOf(address, uint256 tokenId) external view returns (uint256) {
        return 1 + level[tokenId]; // level 3 earns 4× what level 0 earns
    }
}
```

`vault.setStrategy(address(new LevelWeightStrategy()))` — that's the whole wiring. The vault never learns what a level is.

## Quick start

```bash
npx create-robinhood-app my-app                        # contracts only — the smallest start
npx create-robinhood-app my-app --fullstack            # + apps/web (Next 15 + wagmi/viem), pinned to 4663
npx create-robinhood-app my-app --with-token           # keep the optional plain ERC-20 GameToken
npx create-robinhood-app my-app --template ../local    # scaffold from a local checkout or another git URL
```

Or use the template directly:

```bash
git clone --recurse-submodules https://github.com/dvd90/robinhood-app-boilerplate.git my-app
cd my-app && pnpm verify
```

Then `pnpm dryrun` starts a local chain, deploys everything, mints a membership, deposits revenue and distributes it — no RPC, no keys, no accounts needed.

## For AI agents

The CLI never prompts when a name is given, and one command produces a project that already formats, compiles and tests green — including fuzz and invariant runs.

- **[llms.txt](https://dvd90.github.io/robinhood-app-boilerplate/llms.txt)** — the project, its conventions and its docs index, in one fetch
- **[llms-full.txt](https://dvd90.github.io/robinhood-app-boilerplate/llms-full.txt)** — every documentation page, concatenated
- **[CLAUDE.md](CLAUDE.md)** — the five golden rules, the TDD workflow and the definition of done that agents follow

Generated projects carry `CLAUDE.md` and `llms.txt`, so whichever agent opens one respects the invariants the tests enforce — above all, that the vault only ever distributes what was deposited.

## Features

- **Token-bound accounts** — every membership mints an ERC-6551 wallet; control follows `ownerOf`, so selling the NFT hands over its balance too
- **Explicit-deposit vault** — `depositRevenue()` is the only way money enters; no `receive()`, no mint-fee routing, no auto-tax — enforced by tests
- **Pull-based payouts** — `distribute()` allocates, `claim()` pays; a reward token that refuses one recipient (blocklists, as tokenised stocks tend to have) blocks only that recipient, never the round
- **Pluggable weight** — `IWeightStrategy.weightOf(nft, tokenId)` is the whole game surface; `EqualWeightStrategy` by default, `TenureWeightStrategy` as a worked reference
- **Dust carried, never dropped** — integer-division remainder stays in the vault for the next round; an invariant proves Σ paid + Σ claimable + carried == Σ deposited
- **Hostile-token safe** — `nonReentrant` on `distribute()`/`claim()`, fee-on-transfer credited by actual delta, tested against a re-entering mock
- **Deterministic clones** — `Factory.predict(deployer, salt)` before `deploy()`; salts are namespaced per deployer so they never collide
- **Minimal owner powers** — `Ownable2Step`, non-upgradeable clones, no function can move user funds or undistributed balances
- **Fuzz + invariant suite** — 56 tests across 10 suites; CI runs 2048 fuzz runs and 256 invariant runs
- **One-command local run** — `pnpm dryrun` boots anvil, deploys, mints, deposits, distributes, claims
- **Optional front end** — `--fullstack` adds a Next 15 + wagmi/viem app pinned to chain 4663 that reads TBA balances live
- **Optional game token** — `--with-token` keeps a plain ERC-20 with no tax and no hooks
- **CI ready** — GitHub Actions runs the same gate as `pnpm verify`; steps skip themselves in pruned scaffolds
- **Agent ready** — `CLAUDE.md` + `llms.txt` in every scaffold

## Golden rules

Architectural invariants the tests enforce. The full rationale is in [Economics & trust](docs/economics.md) and [CLAUDE.md](CLAUDE.md).

1. **The vault distributes only what is explicitly deposited.** Mint proceeds go to the treasury, never to the vault.
2. **Game mechanics never touch money math.** Weight comes through `IWeightStrategy` and nothing else.
3. **No market-making, multi-wallet or volume tooling.** Not in contracts, scripts or the front end. Ever.
4. **Never hardcode an unverified address.** Chain constants live in two files and carry `VERIFY` tags until confirmed.
5. **Trustlessness over convenience.** Non-upgradeable clones, `Ownable2Step`, no owner escape hatch over funds.

## Scripts

| Command                                                            | What it does                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `pnpm verify`                                                      | `forge fmt --check` + `forge test` (+ `tsc` + `lint` if `apps/web`)   |
| `pnpm dryrun`                                                      | anvil → deploy → mint → deposit → distribute → claim, prints the result |
| `pnpm dryrun <rpc-url>`                                            | same, but forking Robinhood Chain (VERIFY the URL first)              |
| `forge test` (in `contracts/`)                                     | unit + fuzz + invariant tests; `FOUNDRY_PROFILE=ci` for CI depth       |
| `forge script script/Deploy.s.sol --rpc-url robinhood --broadcast` | deploy to chain 4663, writes `deployments/4663.json`                  |
| `pnpm -C apps/web dev`                                             | run the front end (if scaffolded with `--fullstack`)                  |
| `bash packages/create-robinhood-app/test.sh`                       | the scaffold gate: tarball, forge hint, bare + fullstack from a fresh shell, dryrun, docs (CI runs it) |

## Configuration

Nothing is required to test or dry-run. For a real deploy, `Deploy.s.sol` reads these (all optional, defaults shown) and the toolchain reads the RPC/explorer URLs from your shell:

| Variable                                          | Default                        | Used by                        |
| ------------------------------------------------- | ------------------------------ | ------------------------------ |
| `PROJECT_NAME` / `PROJECT_SYMBOL`                 | `Membership` / `MBR`           | the NFT                        |
| `TREASURY`                                        | the deploying account          | receives mint proceeds         |
| `MINT_PRICE` (wei) / `MAX_SUPPLY`                 | `0.01 ether` / `1000`          | the NFT                        |
| `SALT`                                            | `"membership"`                 | deterministic clone addresses  |
| `ERC6551_REGISTRY` / `ERC6551_ACCOUNT_IMPL`       | `Constants.sol` (VERIFY)       | override the 6551 addresses    |
| `ROBINHOOD_RPC_URL` / `ROBINHOOD_BLOCKSCOUT_API_URL` / `BLOCKSCOUT_API_KEY` | — | `foundry.toml` `--rpc-url robinhood` / `--verify` |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` / `_EXPLORER_URL` / `NEXT_PUBLIC_REWARD_TOKENS` | — | `apps/web` (`.env.example`) |

Every value is documented in [Configuration](docs/reference/configuration.md).

## Example project

[`examples/arcade-guild/`](examples/arcade-guild/) is a complete project built **on** the boilerplate without copying it: a `LevelWeightStrategy` where the guild owner raises members' levels and revenue splits by `1 + level`, a test that reuses the shared fixture, and a deploy script that reuses `Deploy.deployCore()`. Three remappings do all the plumbing.

```bash
cd examples/arcade-guild && forge test
```

Walkthrough: [Example: Arcade Guild](docs/guides/example-arcade-guild.md).

## Project structure

```
contracts/
├── src/
│   ├── MembershipNFT.sol        # ERC-721 + one ERC-6551 account per token; proceeds → treasury
│   ├── RevenueVault.sol         # depositRevenue → distribute (allocate) → claim (pay into TBAs)
│   ├── Factory.sol              # cloneDeterministic NFT + vault, wired and owned by the caller
│   ├── Constants.sol            # chain 4663 addresses, every one VERIFY-tagged
│   ├── strategies/              # IWeightStrategy + EqualWeight (default) + TenureWeight (reference)
│   └── GameToken.sol            # optional plain ERC-20 (--with-token)
├── test/                        # unit + fuzz + invariants; mocks incl. a re-entering token
└── script/                      # Deploy.s.sol, DryRun.s.sol, dryrun.sh
apps/web/                        # optional Next 15 + wagmi/viem (--fullstack); lib/robinhood.ts holds addresses
deployments/4663.json            # written by Deploy.s.sol, read by the front end
examples/arcade-guild/           # a project built on the boilerplate via remappings (pruned from scaffolds)
packages/create-robinhood-app/   # the CLI (pruned from scaffolds)
docs/                            # this documentation — the site is generated from it
site/                            # the docs site builder → GitHub Pages (pruned from scaffolds)
CLAUDE.md                        # conventions and invariants for humans and agents — read first
```

## Documentation

Read it at **[dvd90.github.io/robinhood-app-boilerplate](https://dvd90.github.io/robinhood-app-boilerplate/)** — searchable, one page. The source lives in [`docs/`](docs/README.md) and the site is generated from it, so the two can never disagree:

- **[Getting started](docs/getting-started.md)** — install → scaffold → test → local run → deploy, step by step
- **Guides** — [weight strategies](docs/guides/weight-strategies.md) · [deploying](docs/guides/deploying.md) · [front end](docs/guides/frontend.md) · [example: Arcade Guild](docs/guides/example-arcade-guild.md)
- **Concepts** — [architecture](docs/architecture.md) · [economics & trust](docs/economics.md)
- **Reference** — [contracts](docs/reference/contracts.md) · [CLI & scripts](docs/reference/cli.md) · [configuration](docs/reference/configuration.md) · [testing](docs/reference/testing.md)
- **[Maintainers guide](docs/maintainers.md)** — publishing the CLI, the docs site, releases

## Before a real deploy

Every chain-4663 constant (`contracts/src/Constants.sol`, `apps/web/lib/robinhood.ts`, `foundry.toml`) is `VERIFY`-tagged: the values come from project notes, not from official sources. Confirm each against the official Robinhood Chain documentation and the block explorer, then drop the tag. A wrong address is a silent-failure bug.

And a non-code note: tokenised stocks used as reward tokens are restricted securities, and a token that entitles holders to revenue may itself be one. That is a question about *your* token, separate from whether this code is correct — get counsel.

## License

[MIT](LICENSE)
