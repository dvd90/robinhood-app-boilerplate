# Options Desk Guild — example project

A guild whose members underwrite options and split what the desk earns. Members mint a
membership (the NFT); each membership's ERC-6551 account holds the option positions that
membership underwrote; revenue deposited into the vault is split by **open notional held in
that account**. Underwrite nothing, take no share of the round.

The vault, NFT and factory are the boilerplate's own contracts, imported straight from
`../../contracts`. The only new contract is a strategy — 20 lines, no money math.

```
src/PositionWeightStrategy.sol      # weightOf() = open notional in the membership's TBA
test/PositionWeightStrategy.t.sol   # 12 tests on the boilerplate's Fixture (chain 4663, NFT + vault)
test/mocks/MockOptionDesk.sol       # ERC-721 positions whose notional follows transfers
test/mocks/RevertingOptionDesk.sol  # proves a broken desk cannot brick distribute()
script/Deploy.s.sol                 # inherits the boilerplate's Deploy, swaps in the strategy
foundry.toml / remappings.txt       # points at ../../contracts — nothing is duplicated
```

## Why this example exists

It is the answer to "an options protocol is launching on Robinhood Chain — what does the
boilerplate need in order to plug into it?" The answer is: **a weight strategy, and nothing
else.**

- The desk's premiums and LP fees are ordinary ERC-20 revenue. Whoever earns them calls
  `depositRevenue()`. That is external revenue, not recycled entry money, so
  [rule 1](../../CLAUDE.md) holds with no new code path.
- "Who underwrote how much" is game logic. It lives behind `IWeightStrategy` and the vault
  never learns what an option is ([rule 2](../../CLAUDE.md)).
- The membership's TBA does the thing only a TBA can do: it holds another protocol's
  positions on behalf of a transferable membership. Sell the membership and the open
  options go with it — `test_PositionsFollowTheMembership` is that claim, asserted.

**What this is not.** There is no options desk, AMM or pricing engine here, and there will
not be one. Building one would put an options book inside a repo whose whole argument is a
money path small enough to audit once. `MockOptionDesk` is a test double: no desk protocol
is deployed on chain 4663 today, so nothing real can be pointed at yet.

**The line not to cross.** Fees the guild's own capital *earns* and then deposits are
revenue. A hook that taxes members' trades and routes the fee into the vault is the
recycled-deposit model rule 1 exists to forbid — the two sound alike and are not.

## Run it

```bash
export PATH="$HOME/.foundry/bin:$PATH"   # if forge is not on your PATH
cd examples/options-desk-guild
forge test                                # 12 tests, incl. 750/250 split by notional
```

Deploy to a local chain (the script stands up a `MockOptionDesk` on anvil so the demo runs):

```bash
anvil &                                   # local chain on :8545, chain id 31337
forge script script/Deploy.s.sol --sig "runOptionsDesk()" \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil account 0
cat deployments/31337.json
```

On any real chain the script reverts with `DeskNotDeployed` unless you pass `OPTION_DESK`.
That is deliberate: **every chain-4663 address is `VERIFY`-tagged, and a desk address is
the one you would most regret guessing.**

## The strategy

```solidity
function weightOf(address nft, uint256 tokenId) external view returns (uint256) {
    address tba = MembershipNFT(nft).tokenBoundAccount(tokenId);
    try desk.openNotionalOf(tba) returns (uint256 notional) { return notional; }
    catch { return 0; }
}
```

`IPositionDesk.openNotionalOf(address)` is the entire integration surface. A real desk is
unlikely to expose exactly that, so write a thin adapter contract that does and point the
strategy at the adapter.

Three things it does on purpose:

- **Reads the TBA, not the owner.** Weight follows the membership, not the wallet that
  happens to hold it today. Swap `tokenBoundAccount` for `ownerOf` and most of the suite
  goes red.
- **Fails soft.** A desk that reverts drops that membership to weight 0 rather than
  bricking the permissionless `distribute()` for everyone — the same shape as the vault's
  pull-based `claim()`, where one blocklisted recipient only fails its own claim.
- **Immutable `desk`.** No owner can re-point it after members have committed capital.

What it cannot defend against: a desk that burns all the gas forwarded to it, which would
make `distribute()` unusable. `desk` is immutable so it can be reviewed once — point it
only at code you have read.

## Adapt it

- Weight by side, expiry or duration instead of raw notional — the article's "longer
  duration earns more premium" is one more field on the adapter, and the vault still does
  not change.
- Want passive members to keep a floor? Return `base + notional`. Returning bare notional
  is an opinion: **you earn from the desk in proportion to the risk you carried.**
- `weightOf` runs once per membership per `distribute()`. Keep the desk's
  `openNotionalOf` a stored aggregate, never a loop over positions.
- Notionals are summed into `totalWeight`, so keep them in a sane unit; token-decimal
  values across a few thousand members are nowhere near overflowing `uint256`.
