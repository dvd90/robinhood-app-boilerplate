# CLI & scripts

## `create-robinhood-app`

```
npx create-robinhood-app <name> [--bare | --fullstack] [--with-token] [--template <git-url-or-path>]

  --bare        contracts only (default)
  --fullstack   contracts + apps/web (Next 15 + wagmi/viem)
  --with-token  keep the optional plain GameToken ERC-20
  --template    git URL or local path to clone from
                (default: https://github.com/dvd90/robinhood-app-boilerplate.git)
  -h, --help
```

Zero dependencies; Node ≥ 20; needs `git` on the PATH (and Foundry to do anything afterwards).
If `<name>` is omitted it asks once for it — that is the only prompt, so with a name the command is
fully non-interactive. Names must match `^[a-z0-9][a-z0-9-_]*$` (case-insensitive); an existing
directory is refused.

What it does, in order:

1. `git clone --depth 1 --recurse-submodules --shallow-submodules <template> <name>`.
2. Removes the template's own history and everything that is not your project: `.git`, `.gitmodules`,
   each `contracts/lib/*/.git` (submodules become plain vendored directories, so `forge test` works
   offline), `packages/` (the CLI), `examples/`, `PLAN.md`.
3. Without `--fullstack`: removes `apps/`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
4. Without `--with-token`: removes `contracts/src/GameToken.sol` and its test.
5. Renames: the `name` in `package.json`, the first heading of `README.md`, and (fullstack) the
   `<title>` in `apps/web/app/layout.tsx`. No other file is templated — contracts keep their names.
6. `git init && git add -A && git commit -m "chore: scaffold with create-robinhood-app"`.
7. Prints the next steps and the VERIFY warning.

The result must be green with no manual step; `packages/create-robinhood-app/test.sh` scaffolds a bare
and a fullstack project into a temp dir and runs `pnpm verify` in each to prove it.

## Root scripts (`package.json`)

| Command             | What it does                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm verify`       | `forge fmt --check && forge test` in `contracts/`; then `tsc --noEmit && lint` if `apps/web` exists; then the example's own gate if `examples/arcade-guild` exists |
| `pnpm dryrun [rpc]` | `contracts/script/dryrun.sh`: anvil (optionally forking `rpc`) → `Deploy.s.sol` → `DryRun.s.sol` → prints `deployments/31337.json` |

`pnpm verify` is the gate: every commit and every CI run must pass it. Do not skip or comment out a
failing test to get to green.

## Foundry (`contracts/`)

| Command | Notes |
| --- | --- |
| `forge test` | unit + fuzz (512 runs) + invariants (64 runs × depth 32) |
| `FOUNDRY_PROFILE=ci forge test` | fuzz 2048, invariants 256 × 64 — what CI runs |
| `forge test --match-test invariant_Conservation -vvv` | one test, verbose |
| `forge fmt` / `forge fmt --check` | run `forge fmt` twice before `--check` — it is not idempotent on long multi-line `if`s |
| `forge script script/Deploy.s.sol --rpc-url robinhood --broadcast [--verify]` | deploy to 4663; `robinhood` is defined in `foundry.toml` from `ROBINHOOD_RPC_URL` |
| `forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <key>` | deploy to a running anvil |
| `cast call <factory> "predict(address,bytes32)(address,address)" <deployer> <salt> --rpc-url …` | predict clone addresses |

`forge`, `anvil` and `cast` are installed by `foundryup` into `~/.foundry/bin`; add it to your PATH.

## Front end (`apps/web`, when present)

| Command | What it does |
| --- | --- |
| `pnpm install` (repo root) | installs the workspace |
| `pnpm -C apps/web dev` | Next dev server on :3000 |
| `pnpm -C apps/web build` / `start` | production build / serve |
| `pnpm -C apps/web tsc --noEmit` / `lint` | the two checks `pnpm verify` folds in |

## Example (`examples/arcade-guild`, repo only)

| Command | What it does |
| --- | --- |
| `forge test` | the example's 3 tests against the parent's contracts |
| `forge script script/Deploy.s.sol --sig "runArcade()" --rpc-url … --broadcast` | deploy the example project |

## Maintainer scripts

| Command | What it does |
| --- | --- |
| `bash packages/create-robinhood-app/test.sh` | scaffold bare + fullstack from the local checkout and verify both |
| `npm --prefix site run build` / `check` | build the docs site to `site/dist/` / validate without writing |
