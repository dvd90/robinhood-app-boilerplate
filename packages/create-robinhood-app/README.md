# create-robinhood-app

Scaffold an on-chain project for **Robinhood Chain (chain id 4663)** from
[robinhood-app-boilerplate](https://github.com/dvd90/robinhood-app-boilerplate):
an ERC-721 whose every token owns an ERC-6551 account, a vault that shares
explicitly deposited revenue by a pluggable weight, and a factory that clones the pair.

```bash
npx create-robinhood-app my-app                 # contracts only (Foundry)
npx create-robinhood-app my-app --fullstack     # + Next 15 + wagmi/viem front end
npx create-robinhood-app my-app --with-token    # keep the optional plain ERC-20 GameToken
cd my-app && pnpm verify && pnpm dryrun
```

Zero dependencies, Node ≥ 20, needs `git` and [Foundry](https://getfoundry.sh).
Never prompts when a name is given, so it is safe in scripts and for AI agents.

Documentation: https://dvd90.github.io/robinhood-app-boilerplate/
