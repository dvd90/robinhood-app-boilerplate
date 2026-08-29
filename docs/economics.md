# Economics & trust

What a holder can rely on, what the owner can and cannot do, and why the code is shaped the way it
is. If you change the economic model, this is the page that has to change first.

## The model in one paragraph

Someone deploys a project: an NFT collection plus a vault. People mint memberships and pay the
mint price to the project's **treasury**. Separately, revenue — ERC-20 tokens, typically tokenised
stocks on Robinhood Chain — is **deposited** into the vault by whoever earns it. Anyone can then
call `distribute()`, which splits that deposit across every current membership according to a
**weight** the project chose, and anyone can call `claim()` to push each share into the
membership's own wallet. Sell the membership and the wallet, with everything in it, goes to the
buyer.

It is a revenue share. It is **not** a recycled-deposit scheme: mint money never comes back out of
the vault as "revenue", because mint money never enters the vault.

## The five golden rules, and why

These are the architectural invariants from `CLAUDE.md`. Each has at least one test that fails if
it is broken.

**1. The vault distributes only what is explicitly deposited via `depositRevenue()`.**
Mint proceeds go to the treasury. There is no `receive()`, no fee hook, no path from `mint()` to
the vault. *Why:* the moment mint fees or sell taxes flow into the vault, early members are paid
with later members' entry money and the product becomes a different thing with a different legal
character. Tests: `test_MintProceedsLandAtTreasury_VaultUntouched`, `test_MintNeverTouchesVault`,
`test_MintProceedsNeverReachFactoryOrVault`, `testFuzz_TransferHasNoTax` (GameToken).

**2. Game mechanics never touch money math.**
Weight arrives through `IWeightStrategy.weightOf()` and nothing else. The vault's tests run against
a mock strategy that knows nothing about levels or tenure. *Why:* the money path stays small enough
to audit and invariant-test once; the game can change every week.

**3. No market-making, multi-wallet or volume-simulation tooling.**
Not in contracts, scripts or the front end, permanently. *Why:* it is out of scope for a revenue
share, and shipping it in a template invites misuse under your name.

**4. Never hardcode an unverified address.**
Every chain-4663 constant lives in two files and carries a `VERIFY` tag until confirmed against
official docs and the explorer. *Why:* a wrong registry address does not revert — it silently
creates accounts nobody controls.

**5. Trustlessness over convenience.**
Clones are non-upgradeable; ownership is `Ownable2Step`; no function lets an owner pull tokens out
of a member's wallet or out of undistributed vault balances. *Why:* holders should be able to read
the code once and know the rules cannot change under them.

## What the owner can and cannot do

The **NFT owner** (the deployer, or whoever they hand it to via the two-step transfer):

| Can                                      | Cannot                                                        |
| ---------------------------------------- | ------------------------------------------------------------- |
| change `mintPrice` (future mints only)   | mint for free or above `maxSupply`                            |
| change `treasury` (must accept ETH)      | touch any token-bound account or its contents                 |
| —                                        | burn, freeze or transfer members' tokens; there is no such function |

The **vault owner**:

| Can                                                   | Cannot                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| swap the `IWeightStrategy` (emits `StrategyUpdated`)  | withdraw anything — the only outflow is `claim()` into TBAs     |
| therefore skew a *future* round's split               | change allocations already in `claimable`                       |
| pick a strategy that returns `0` for all (round no-ops, deposit stays distributable) | make deposits disappear |

The stated trust assumption is therefore: **the vault owner chooses the weights.** If that matters
to your members, put a multisig or a timelock behind the owner so a strategy change is visible
before it applies.

**Nobody** — owner, factory, deployer — can upgrade a clone or drain the vault.

## Rounding, dust and edge cases

- **Dust.** `amount × w_i / Σw` rounds down per member. The remainder stays in `distributable`
  and is included in the next round. Over many rounds it converges to zero loss;
  it is never sent to the owner or burned. Invariant: Σ claimed + Σ claimable + carried == Σ deposited.
- **Zero weight** is "no share this round". Zero *total* weight is a no-op; the deposit waits.
- **Blocklisted recipients.** Payment is pull-based. A token that refuses one wallet makes only
  that wallet's `claim` revert; the allocation stays in `claimable` until the block lifts. Everyone
  else claims normally.
- **Fee-on-transfer tokens.** The vault credits the balance delta, not the requested amount.
- **Re-entrancy.** `depositRevenue`, `distribute` and `claim` are `nonReentrant`; a hostile token
  that re-enters on transfer is part of the test suite.
- **Transfers mid-round.** Allocations are per `tokenId`, not per address, and are paid into the
  token's wallet. Whoever holds the token at claim time — or later — controls the money. Selling
  after `distribute()` but before `claim()` sells the pending share too; that is by design.
- **Scale.** `distribute()` reads every token's weight in one transaction. Past a few thousand
  tokens it needs pagination; the code marks the spot.

## Legal note

Non-code, but load-bearing. The reward tokens this template targets — tokenised stocks — are
restricted securities. A membership token that entitles its holder to a share of revenue may
itself be one. That is a question about **your** token, your jurisdiction and your users; it is
separate from whether this code is correct, and this documentation is not advice. Get counsel
before a real deploy.
