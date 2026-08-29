# Arcade Guild — example project

A game guild built on the boilerplate without copying it. Members mint a guild card (the NFT);
the game server raises a member's **level**; revenue deposited into the vault is split by
`weight = 1 + level`. The vault, NFT and factory are the boilerplate's own contracts, imported
straight from `../../contracts` — the only new contract is the strategy.

```
src/LevelWeightStrategy.sol     # the whole game: setLevel() by the owner, weightOf() = 1 + level
test/LevelWeightStrategy.t.sol  # reuses the boilerplate's test Fixture (chain 4663, registry, NFT + vault)
script/Deploy.s.sol             # inherits the boilerplate's Deploy, swaps in LevelWeightStrategy
foundry.toml / remappings.txt   # points at ../../contracts — nothing is duplicated
```

## Run it

```bash
export PATH="$HOME/.foundry/bin:$PATH"   # if forge is not on your PATH
cd examples/arcade-guild
forge test                                # 3 tests, incl. distribute pays 400/100 for levels 3/0
```

Deploy to a local chain:

```bash
anvil &                                   # local chain on :8545, chain id 31337
forge script script/Deploy.s.sol --sig "runArcade()" \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil account 0
cat deployments/31337.json
```

On Robinhood Chain: same command with `--rpc-url robinhood` (needs `ROBINHOOD_RPC_URL`) and your
own key. **Every chain-4663 address in `contracts/src/Constants.sol` is `VERIFY`-tagged — confirm
them first.**

## How it plugs in

Three remappings do all the work (`remappings.txt`):

| Prefix              | Points at               | Used for                                   |
| ------------------- | ----------------------- | ------------------------------------------ |
| `robinhood/`        | `../../contracts/src/`  | `IWeightStrategy`, `Factory`, `Constants`  |
| `robinhood-test/`   | `../../contracts/test/` | the shared `Fixture`                       |
| `robinhood-script/` | `../../contracts/script/` | `Deploy.deployCore()`                    |

`allow_paths = ["../../contracts"]` in `foundry.toml` lets solc read files outside this directory.
`@openzeppelin/contracts/` is pinned explicitly because `lib/reference` vendors an older OpenZeppelin
that forge would otherwise auto-detect.

## Adapt it

- Replace `setLevel` with whatever your game emits — XP, wins, staked tokens. Only `weightOf()` is
  read by the vault, and only at `distribute()` time.
- Weights are read for every token on each `distribute()`; keep `weightOf()` cheap (a mapping read).
- The guild owner controls levels, so they control the split. If that matters to your members, make
  the owner a multisig — they still cannot withdraw a single token from the vault.
