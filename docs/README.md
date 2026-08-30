# Documentation

**Start here:** [Getting started](getting-started.md) — install, scaffold, test, run locally, deploy. About 10 minutes.

**New to crypto?** Read the [tutorial](tutorial.md) first — every concept in plain words, with diagrams and a worked example.

**Using an AI agent?** Point it at [CLAUDE.md](../CLAUDE.md) — the five golden rules, the TDD workflow and the gate it must keep green.

## Tutorials & guides

| Doc                                                    | What it covers                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [Tutorial](tutorial.md)                                | What you built and what you can build with it, in plain words — no crypto background needed |
| [Getting started](getting-started.md)                  | Five steps from nothing to a deployed project, each with the output you should see |
| [Weight strategies](guides/weight-strategies.md)       | `IWeightStrategy`, the two shipped strategies, writing your own, what a bad one can do |
| [Deploying](guides/deploying.md)                       | The anvil dry run, deploying to Robinhood Chain, `deployments/<chainId>.json`, the VERIFY checklist |
| [Front end](guides/frontend.md)                        | The optional Next 15 + wagmi/viem app: how it reads the chain, env vars, caveats |
| [Example: Arcade Guild](guides/example-arcade-guild.md) | A complete project built on the boilerplate without copying it                |

## Concepts

| Doc                                  | What it covers                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| [Architecture](architecture.md)      | Mint → token-bound account, deposit → distribute → claim, how the factory clones |
| [Economics & trust](economics.md)    | The revenue-share model, the golden rules and why, what the owner can and cannot do, the legal note |

## Reference

| Doc                                          | What it covers                                                        |
| -------------------------------------------- | --------------------------------------------------------------------- |
| [Contracts](reference/contracts.md)          | Every public function, event and error of every contract              |
| [CLI & scripts](reference/cli.md)            | `create-robinhood-app` flags and behaviour, every `pnpm`/`forge` command |
| [Configuration](reference/configuration.md)  | Every environment variable and Foundry profile                        |
| [Testing](reference/testing.md)              | The test map, the two headline invariants, the mocks, adding a test   |

## For maintainers

| Doc                                  | What it covers                                                        |
| ------------------------------------ | --------------------------------------------------------------------- |
| [Maintainers guide](maintainers.md)  | Publishing the CLI, building and deploying the docs site, releases    |
