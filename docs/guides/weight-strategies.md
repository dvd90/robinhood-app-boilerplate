# Weight strategies

The vault splits every distribution pro-rata by *weight*. Weight comes from one interface, and
that interface is the only place game logic is allowed to live.

```solidity
interface IWeightStrategy {
    function weightOf(address nft, uint256 tokenId) external view returns (uint256 weight);
}
```

At `distribute()` time the vault calls `weightOf(nft, id)` for every minted token (`1..totalSupply`),
sums the results, and allocates `amount × weight / totalWeight` to each token. A weight of `0`
means "no share this round". If *every* weight is `0` the round is a no-op and the deposit waits
for the next one.

## The two that ship

**`EqualWeightStrategy`** — the default. `weightOf` returns `1` for everything: every member earns
the same. It is what `Deploy.s.sol` wires in.

**`TenureWeightStrategy`** — a worked reference. `weight = 1 + (now − heldSince) / period`, where
`MembershipNFT.heldSince(tokenId)` is the timestamp the *current* owner acquired the token — it
resets on every transfer, so a buyer starts at weight `1`. It exists to prove the point: it is
swapped into the vault with zero vault changes (`test_VaultUsesTenureWithoutChanges`).

```solidity
function weightOf(address nft, uint256 tokenId) external view returns (uint256) {
    return 1 + (block.timestamp - MembershipNFT(nft).heldSince(tokenId)) / period;
}
```

## Write your own

1. **Copy `TenureWeightStrategy.sol`** next to it and rename.
2. **Decide the inputs.** Anything on-chain and `view`-readable: the NFT's `heldSince`, your own
   storage (levels, XP, wins), another contract's balances. `weightOf` is `view`, so it cannot write.
3. **Decide who can change the inputs.** If a server or the guild owner sets levels, gate the setter
   (`Ownable`). Remember the trust consequence: whoever controls weights controls the split.
4. **Write the test first** — copy `contracts/test/strategies/TenureWeightStrategy.t.sol`. The shared
   `Fixture` gives you a minted-ready NFT, a vault, a mock reward token and helpers; the pattern is
   `vault.setStrategy(address(yours))` in `setUp`, then mint → deposit → distribute → claim and
   assert TBA balances. Add a fuzz test for the weight formula.
5. **Wire it** in your deploy script: pass its address as `Factory.Params.strategy`, or call
   `vault.setStrategy()` later (owner only; emits `StrategyUpdated`).

A complete, tested example is [Arcade Guild](example-arcade-guild.md): an owner-set level mapping
with `weight = 1 + level`. For a strategy whose input comes from a contract nobody in the project
controls, see [Options Desk Guild](example-options-desk-guild.md), which weights each membership by
what its token-bound account holds in an external protocol.

## Rules of thumb

- **Keep `weightOf` cheap.** It runs once per token per distribution, in one transaction. A mapping
  read is fine; a loop over other tokens is not. Past a few thousand tokens `distribute()` itself needs
  pagination — it is marked in the source.
- **Never revert.** A reverting `weightOf` bricks every distribution until the strategy is swapped.
  Return `0` for "not eligible" instead. If you read an external contract, that includes *its*
  reverts: wrap the call in `try`/`catch` and fall back to `0`, so one broken dependency cannot take
  the whole round down. [Options Desk Guild](example-options-desk-guild.md) does this and tests it.
- **Watch the sum.** `totalWeight` is a `uint256` sum of every weight; keep individual weights far
  below `2^200` and overflow is impossible in practice. The vault uses `Math.mulDiv`, so
  `amount × weight` never overflows either.
- **Do not read the reward token.** Weight based on how much a member already earned creates a
  feedback loop. Weight should come from the game, not from the money.

## What a malicious strategy can and cannot do

The owner picks the strategy, so the owner picks the weights. That is a stated trust assumption,
and its blast radius is bounded:

| A bad strategy can…                                | It cannot…                                                    |
| -------------------------------------------------- | ------------------------------------------------------------- |
| give all weight to one token (skew a round)        | move tokens out of the vault — only `claim()` does, into TBAs |
| return `0` for everyone (freeze deposits in the vault, still distributable later) | take undistributed balances; nothing is ever burned or swept |
| revert and block `distribute()` until swapped      | touch already-`claimable` allocations from earlier rounds     |

If that matters to your members, make the vault owner a multisig or a timelock: the strategy
change becomes visible before it applies. See [Economics & trust](../economics.md).
