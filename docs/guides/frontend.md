# Front end

Scaffold with `--fullstack` and you get `apps/web`: Next 15 (App Router) + wagmi 2 + viem 2 +
TanStack Query, pinned to Robinhood Chain and nothing else. It is deliberately small — one page,
three components, plain CSS — so it reads as a reference, not a product.

```
apps/web/
├── app/
│   ├── layout.tsx        # metadata (the CLI rewrites the title), wraps Providers
│   ├── page.tsx          # connect / switch-chain UI + the three components
│   ├── providers.tsx     # WagmiProvider + QueryClientProvider
│   └── globals.css
├── components/
│   ├── Mint.tsx          # price, supply, sold-out state, mint button
│   ├── Holdings.tsx      # your tokens, each TBA's balance per reward token, claim button
│   └── Distribute.tsx    # pending `distributable` per reward token, permissionless distribute
├── lib/
│   ├── robinhood.ts      # THE address file — chain, registry, account impl, NFT, vault, reward tokens
│   ├── abi.ts            # minimal hand-written ABIs (keep in sync with contracts/src)
│   └── wagmi.ts          # config: one chain, injected connector
└── .env.example
```

## Run it

```bash
pnpm install                 # once, at the repo root
cp apps/web/.env.example apps/web/.env
pnpm -C apps/web dev         # http://localhost:3000
```

Until `deployments/4663.json` holds real addresses the page shows a **Not deployed yet** banner and
hides the components — `IS_DEPLOYED` in `lib/robinhood.ts` is `chainId === 4663 && nft !== 0x0`.

## Environment

| Variable                             | Meaning                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL`      | RPC for chain 4663 — VERIFY against official docs              |
| `NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL` | Blockscout base URL, used for links — VERIFY                   |
| `NEXT_PUBLIC_REWARD_TOKENS`          | comma-separated ERC-20 addresses the vault distributes; invalid entries are dropped |

All three are read only in `lib/robinhood.ts`. No component holds an address literal — that is a
convention (`CLAUDE.md` rule 4), and the reason the file exists.

## How it reads the chain

- **Addresses** come from a static import: `import deployments from "../../../deployments/4663.json"`.
  That is a build-time import, not a fetch — **after a redeploy, rebuild the app.**
- **Your holdings** — `Holdings.tsx` scans `ownerOf(1..totalSupply)` to find your ids, then
  `tokenBoundAccount(id)` for each, then `balanceOf(tba)` on every reward token and
  `claimable(token, id)` on the vault. It is O(supply) reads on purpose; the source marks where to
  switch to indexing `Minted`/`Transfer` events when supply grows.
- **Value in USD** is not shown. The spot where it belongs carries a `VERIFY` comment: wire the
  official Robinhood Chain price feed once its address is confirmed. Never trust a hardcoded price.

## Conventions

- One chain. `lib/wagmi.ts` configures `robinhoodChain` only; the UI offers *switch to 4663*, never
  a chain picker.
- Read through the ABIs in `lib/abi.ts`. They are hand-written and minimal — when you add a
  function to a contract, add it there too.
- The gate for this app is `pnpm -C apps/web tsc --noEmit && pnpm -C apps/web lint`, folded into
  `pnpm verify` when `apps/web/package.json` exists.
- Import `injected` from `wagmi`, not `wagmi/connectors` — the latter pulls a dependency chain that
  breaks `next build`.
