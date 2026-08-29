# Example: Options Desk Guild

A second complete project built **on** the boilerplate, and the answer to a question that comes up
whenever a new protocol launches on Robinhood Chain: *an options desk is going live — what does the
boilerplate need in order to plug into it?*

**A weight strategy, and nothing else.**

Members mint a membership; each membership's ERC-6551 account holds the option positions that
membership underwrote; revenue deposited into the vault is split by the **open notional held in that
account**. Underwrite nothing and you take no share of the round.

It lives at [`examples/options-desk-guild/`](../../examples/options-desk-guild/) and is pruned from
scaffolded projects — documentation you can run.

## Run it

```bash
cd examples/options-desk-guild
forge test
```

```
Ran 12 tests for test/PositionWeightStrategy.t.sol:PositionWeightStrategyTest
[PASS] testFuzz_DistributeConservesTheDeposit(uint256,uint256,uint256) (runs: 512, …)
[PASS] test_DistributePaysByOpenNotional() (gas: 805607)
[PASS] test_PositionsFollowTheMembership() (gas: 825955)
…
Suite result: ok. 12 passed; 0 failed; 0 skipped
```

Deploy to a local chain — the script stands up a `MockOptionDesk` on anvil so the demo runs end to
end:

```bash
anvil &
forge script script/Deploy.s.sol --sig "runOptionsDesk()" \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil account 0
cat deployments/31337.json
```

On any real chain it reverts with `DeskNotDeployed` unless you pass `OPTION_DESK`. No options desk
is deployed on chain 4663 today, and a desk address is the one you would most regret guessing — see
the [VERIFY checklist](deploying.md).

## The whole integration

```solidity
interface IPositionDesk {
    function openNotionalOf(address account) external view returns (uint256 notional);
}

contract PositionWeightStrategy is IWeightStrategy {
    IPositionDesk public immutable desk;

    function weightOf(address nft, uint256 tokenId) external view returns (uint256) {
        address tba = MembershipNFT(nft).tokenBoundAccount(tokenId);
        try desk.openNotionalOf(tba) returns (uint256 notional) { return notional; }
        catch { return 0; }
    }
}
```

That is the entire surface. A real desk is unlikely to expose exactly `openNotionalOf`, so write a
thin adapter contract that does and point the strategy at the adapter.

### Why it reads the TBA and not the owner

This is the example's whole point, and the one place the ERC-6551 account earns its keep. The
positions are held by the *membership*, not by the wallet that happens to hold the membership today.
Sell the membership and the open options go with it:

```solidity
function test_PositionsFollowTheMembership() public {
    uint256 a = _mint(alice);
    desk.open(_tba(a), 1000);

    vm.prank(alice);
    nft.transferFrom(alice, carol, a);

    assertEq(positions.weightOf(address(nft), a), 1000);  // unchanged
    // …and the next distribute() pays carol's TBA.
}
```

Swap `tokenBoundAccount` for `ownerOf` and most of the suite goes red. That is the assertion the
[TBA-control invariant](../reference/testing.md) makes at the vault level, cashed out at the
strategy level.

### Why it fails soft

`weightOf` reads a contract the boilerplate does not control, and `distribute()` is permissionless
and loops every membership. A desk that reverts must not take the round down with everyone in it, so
a failed read degrades to weight 0 — the same shape as the vault's pull-based `claim()`, where one
blocklisted recipient only fails its own claim.

`test_RevertingDeskDegradesToZeroWeightAndDoesNotBrickDistribute` pins it: remove the `try`/`catch`
and that test goes red with `DeskDown()`.

It cannot defend against a desk that burns all the gas forwarded to it, which would make
`distribute()` unusable. `desk` is immutable so it can be reviewed once and cannot be re-pointed
after members commit capital — but point it only at code you have read.

## Where the golden rules land

| Rule                                            | How this example keeps it                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **1** — only deposited revenue is distributed   | Desk premiums and LP fees are ordinary ERC-20 revenue; whoever earns them calls `depositRevenue()`. No new path into the vault. |
| **2** — game mechanics never touch money math   | "Who underwrote how much" lives entirely behind `IWeightStrategy`. The vault never learns what an option is.  |
| **3** — no market-making tooling                | There is no desk, AMM or pricing engine here, and there will not be one. `MockOptionDesk` is a test double.   |
| **4** — never hardcode an unverified address    | `OPTION_DESK` is required and unset by default; the deploy reverts rather than guessing.                      |
| **5** — trustlessness over convenience          | `desk` is immutable; the strategy holds no funds and has no owner.                                            |

### The line not to cross

Fees the guild's own capital *earns*, and then deposits, are revenue. A hook that taxes members'
trades and routes the fee into the vault is the recycled-deposit model rule 1 exists to forbid. The
two descriptions sound alike — "the protocol sends fees to the vault" — and they are not the same
thing. See [Economics & trust](../economics.md).

## Adapt it

- **Weight by side, expiry or duration** instead of raw notional: one more field on the adapter, and
  the vault still does not change.
- **Give passive members a floor** by returning `base + notional`. Returning bare notional is an
  opinion — you earn from the desk in proportion to the risk you carried — and it exercises a vault
  behaviour the other example does not: zero weight is "no share this round", and zero *total* weight
  makes the round a no-op with the deposit left waiting.
- **Keep `openNotionalOf` a stored aggregate.** It is called once per membership per `distribute()`;
  a loop over positions there is a loop inside a loop.

Compare with [Arcade Guild](example-arcade-guild.md), where weight comes from state the guild owner
writes. Here it comes from a contract nobody in the guild controls. Both are the same seam.
