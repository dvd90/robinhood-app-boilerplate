# PLAN.md

Test-first build plan. Build order is bottom-up: each contract's spec goes red, then green,
then its fuzz/invariant runs, before the next mounts on top.

## Goal

`npx create-robinhood-app my-idea` → a Foundry + Next monorepo, chain 4663 pre-wired, that
compiles, tests green, deploys a working NFT + revenue-share vault, and ships `CLAUDE.md`
so an agent extends it to conventions.

## Architecture in one line

ERC-721 where each token owns a 6551 TBA; a vault distributes **explicitly deposited**
revenue pro-rata by a pluggable weight strategy; a factory clones the pair deterministically.

**The one wire we never connect:** mint proceeds → treasury, not the vault. The vault pays
out only `depositRevenue()` inflows. See CLAUDE.md rule 1.

---

## The spec (write these first)

### MembershipNFT
- [ ] mints sequential ids, respects `maxSupply`
- [ ] enforces mint price; refunds excess ETH
- [ ] mint creates a TBA at the canonical 6551 registry address
- [ ] computed address == `registry.account(impl, salt, 4663, nft, tokenId)`
- [ ] **invariant:** TBA control follows the NFT — after a random transfer sequence,
      `tba` owner resolves to the current `ownerOf(tokenId)`
- [ ] mint proceeds land at treasury, and vault balance is unchanged by minting (guards rule 1)

### RevenueVault
- [ ] `depositRevenue(token, amt)` increases that token's distributable balance
- [ ] `distribute()` splits pro-rata by strategy weight across current holders
- [ ] `distribute()` is permissionless
- [ ] **invariant:** conservation — Σ distributed == deposited − carried dust
- [ ] **invariant:** no holder receives more than its weighted share
- [ ] dust (division remainder) carries to the next round, never lost
- [ ] zero-holders case holds (doesn't brick, funds remain for next round)
- [ ] multiple reward tokens tracked independently
- [ ] weight read only via `IWeightStrategy` (inject a mock)
- [ ] reentrancy guard holds against a re-entering ERC-20 mock

### Factory
- [ ] deploys NFT + Vault clones deterministically
- [ ] `predictDeterministicAddress` == deployed addresses
- [ ] **invariant:** distinct salts never collide
- [ ] two deploys are state-isolated (mint on A doesn't affect B)
- [ ] ownership transfers to caller; clones cannot be re-initialized

### Integration
- [ ] e2e: deploy → mint to N wallets → `depositRevenue` → `distribute` → each TBA holds its share
- [ ] transfer an NFT mid-cycle → next `distribute` pays the new owner

---

## Step by step

### Phase 0 — Scaffold (½ day)
1. `forge init contracts`; add deps: `openzeppelin-contracts`, `erc6551` (tokenbound), `solmate` (optional).
2. `foundry.toml`: profiles, `fuzz.runs = 512`, `invariant.runs`/`depth` set, RPC + Blockscout
   endpoints for 4663 (VERIFY-tagged).
3. `Constants.sol` + `lib/robinhood.ts` stubs — every external address a `VERIFY` TODO.
4. Commit the empty gate: `forge fmt --check && forge test` green on zero tests.

### Phase 1 — MembershipNFT (1–2 days)
5. Write the MembershipNFT spec above → **red**.
6. Implement: ERC-721, `mint()` (price + refund + treasury), `_createTBA()` calling the registry.
7. Green. Then add the **TBA-follows-transfer invariant** with a handler that mints/transfers randomly.
8. Add the "vault untouched by mint" test now so rule 1 is guarded from day one.

### Phase 2 — RevenueVault (2–3 days)
9. Write the vault spec + `MockWeightStrategy` + `MockRewardToken` (benign) → **red**.
10. Implement: `depositRevenue`, `distribute`, per-token accounting, dust carry-forward,
    `nonReentrant`, checks-effects-interactions.
11. Green. Add the **conservation invariant** (fuzz random deposits × random holder sets)
    and the reentrancy test with a hostile token mock.
12. Confirm both headline invariants green before continuing.

### Phase 3 — Strategy (½ day)
13. `IWeightStrategy` + `EqualWeightStrategy` (default). Test equal split.
14. One example non-trivial strategy (e.g. tenure-weighted) as a reference — tested in isolation,
    proving the vault needs no changes to swap strategies.

### Phase 4 — Factory (1–2 days)
15. Write the factory spec → **red**.
16. Implement `cloneDeterministic` of NFT + Vault, `initialize` wiring, `transferOwnership`.
17. Green. Add salt-collision and state-isolation invariants; assert re-`initialize` reverts.

### Phase 5 — Integration + deploy (1 day)
18. Write the two integration tests → **red** → implement `Deploy.s.sol` to satisfy them → green.
19. `Deploy.s.sol` writes `deployments/4663.json`.
20. Local run against an **anvil fork of 4663**; dry-run mint → deposit → distribute.

### Phase 6 — Frontend, optional (2–3 days, `--fullstack`)
21. Next 15 + wagmi/viem, chain pinned to 4663. Read TBAs, show holdings + next-distribution
    progress, mint button, permissionless `distribute` button.
22. `tsc --noEmit` + `lint` join the gate.

### Phase 7 — CLI (1–2 days)
23. `create-robinhood-app` (Node + prompts): copy `template/`, replace placeholders, prune by
    flag (`--bare | --fullstack | --with-factory`).
24. Post-scaffold: `pnpm install && forge test` must be green out of the box.
25. Publish template repo + npm package.

---

## The gate (repeat every phase)

```bash
forge fmt --check && forge test && \
pnpm -C apps/web tsc --noEmit && pnpm -C apps/web lint   # web steps if present
```

## Definition of done

- All spec boxes checked; both headline invariants green.
- Fresh scaffold installs and tests green with zero manual steps.
- No auto-tax path into the vault anywhere in the tree (grep the diff).
- Every external address either verified or clearly `VERIFY`-tagged; no bare literals in `apps/web`.
- `CLAUDE.md` present in the template so agents inherit the conventions.

## Before a real deploy (non-code)

- Verify all chain-4663 constants against official docs + explorer; remove `VERIFY` tags.
- Get counsel on your token: the reward stock tokens are restricted securities, and a token
  entitling holders to revenue may itself be one. That's a question about *your* token,
  separate from whether the code is correct.
