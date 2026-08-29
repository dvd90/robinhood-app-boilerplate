# Testing

`contracts/test/` is the spec. 56 tests across 10 suites (54 without the optional `GameToken`),
plus fuzz and invariant runs. `forge test` runs them in well under a second; CI runs the deeper
`ci` profile.

## The two headline invariants

Both must stay green before any integration work — they are what makes the rest trustworthy.

**Vault conservation** — `RevenueVault.invariant.t.sol › invariant_Conservation`. A handler mints,
transfers, changes weights, deposits, distributes and claims at random across two reward tokens,
tracking a ghost `deposited`. After every sequence:
`Σ claimed + Σ claimable + distributable == Σ deposited`, and the vault physically holds
everything not yet claimed. Nothing minted, nothing lost, dust included.

**TBA control follows the NFT** — `MembershipNFT.invariant.t.sol › invariant_TBAControlFollowsNFT`.
After random mint/transfer sequences, every token's ERC-6551 account exists and
`ERC6551Account(tba).owner() == nft.ownerOf(id)`. Plus `invariant_SupplyNeverExceedsMax`.

## Test map

| File | Kind | What it pins down |
| --- | --- | --- |
| `MembershipNFT.t.sol` | unit + fuzz | sequential ids, `maxSupply`, price enforcement, excess refund, TBA at the canonical registry (fuzz: computed == registry), **mint proceeds → treasury, vault untouched**, events, re-init rejected, owner setters, `heldSince`, treasury must accept ETH |
| `MembershipNFT.invariant.t.sol` | invariant | the TBA-control invariant above |
| `RevenueVault.t.sol` | unit + fuzz | deposit/distribute/claim accounting, permissionless calls, claim-twice-pays-once, accumulation across rounds, **blocked recipient does not block others**, dust carry, zero holders / zero weight keep funds, `NothingToDistribute`, multi-token independence, weights only via strategy, **re-entrancy guard holds**, mint never touches vault, fuzz: no holder exceeds its weighted share |
| `RevenueVault.invariant.t.sol` | invariant | conservation |
| `Factory.t.sol` | unit + fuzz | clones wired and owned by caller, `predict == deployed` (fuzz), same salt same deployer reverts, same salt different deployers do not collide, clones/impls cannot be (re)initialized, two projects isolated, proceeds never reach factory or vault, event |
| `Factory.invariant.t.sol` | invariant | distinct salts never collide; projects stay state-isolated |
| `Integration.t.sol` | end-to-end | through the real `Deploy.deployCore()`: deploy → 5 mints → deposit → distribute → claim → each TBA holds its share (and a TBA can be operated by its owner); transfer mid-cycle pays the new owner next round |
| `strategies/EqualWeightStrategy.t.sol` | unit + fuzz | every token weighs 1; equal split |
| `strategies/TenureWeightStrategy.t.sol` | unit | weight grows per period, transfer resets, **vault needs no changes**, zero period reverts |
| `GameToken.t.sol` | unit + fuzz | supply to recipient; **no transfer tax** (fuzz) |

Bold entries are the tests that enforce a golden rule.

## The harness and the mocks

`test/utils/Fixture.sol` — `abstract contract Fixture is Test`. `setUp` pins `vm.chainId(4663)`,
etches the real `ERC6551Registry` bytecode at `Constants.ERC6551_REGISTRY`, deploys an
`ERC6551Account` implementation, clones one `MembershipNFT` + `RevenueVault` pair owned by the test
contract, with `MockWeightStrategy` and `MockRewardToken`. Helpers: `_mint(who)`, `_deposit(token, amount)`,
`_claimAll(token)`, `_ids(id)`, `_tba(id)`. Extend it for any new test — the Arcade Guild example
does so from outside the project.

| Mock | Purpose |
| --- | --- |
| `MockRewardToken` | benign ERC-20 with public `mint` |
| `MockWeightStrategy` | settable per-token weights + `defaultWeight`; counts reads, so tests can prove the vault reads weight only through the strategy |
| `BlocklistToken` | reverts transfers to blocked recipients — models transfer-restricted stock tokens |
| `ReenteringToken` | re-enters `claim()` and `distribute()` on every vault transfer and counts attempts vs successes |

## Adding a test

1. New strategy → copy `strategies/TenureWeightStrategy.t.sol`; the pattern is `vault.setStrategy`
   in `setUp`, mint two differing members, deposit a round number, distribute, `_claimAll`, assert
   TBA balances. Add a fuzz test for the formula.
2. New vault behaviour → write the failing unit test in `RevenueVault.t.sol` first, run, confirm red,
   implement. If it touches arithmetic, extend `VaultHandler` in the invariant file so conservation
   covers it.
3. Anything touching ownership → add to the relevant invariant handler.
4. `forge fmt` (twice), `pnpm verify`.

## Profiles

| | `forge test` | `FOUNDRY_PROFILE=ci forge test` |
| --- | --- | --- |
| fuzz runs | 512 | 2048 |
| invariant runs × depth | 64 × 32 | 256 × 64 |
| `fail_on_revert` | true | true |

Handlers must therefore never revert on their own: they read values *before* `vm.prank` (a prank is
consumed by the very next call, view calls included) and bound their inputs.
