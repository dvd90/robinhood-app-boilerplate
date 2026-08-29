# Maintainers guide

From this repo to a public, reusable template, and the routine that keeps it healthy.

## Publish the CLI

`packages/create-robinhood-app` is zero-dependency and versioned separately from the template it
clones: a CLI published today clones tomorrow's `main`. That is why the prune list (what a scaffold
must *not* contain) matters — adding a top-level directory to the repo means adding it to `rm(...)`
in `bin/index.mjs` and to the assertions in `test.sh`.

```bash
bash packages/create-robinhood-app/test.sh   # bare + fullstack scaffolds, both verified green
cd packages/create-robinhood-app
npm version patch                            # or minor
npm login && npm publish                     # unscoped → public
```

Then, from a clean directory: `npx create-robinhood-app@latest smoke && cd smoke && pnpm verify`.

## The docs site

`docs/**/*.md` and `README.md` are the only source. `site/build.mjs` renders them into one
self-contained `site/dist/index.html` (CSS, client script and search index inlined) plus
`llms.txt`, `llms-full.txt`, `CLAUDE.md`, `robots.txt` and `sitemap.xml`.

```bash
npm --prefix site ci
npm --prefix site run check     # validate: every doc in the nav, no dead links — CI runs this
npm --prefix site run build     # write site/dist/
open site/dist/index.html
```

Rules the build enforces (as errors, not warnings):

- every `.md` under `docs/` must be listed in `site/pages.mjs`, or the build fails — no unreachable pages;
- every relative markdown link must resolve to a page or a heading; links to source files become GitHub links;
- every `#anchor` must exist.

Deployment is `.github/workflows/docs.yml`: on push to `main` touching `docs/**`, `README.md`,
`CLAUDE.md`, `llms.txt` or `site/**`, it builds and publishes to GitHub Pages. Enable once in
**Settings → Pages → Source: GitHub Actions**. The site URL is
`https://dvd90.github.io/robinhood-app-boilerplate/`.

## The gate, and what each part exists for

Every PR runs four CI jobs; all of them also run locally.

| Job / command | Catches |
| --- | --- |
| `contracts` — `forge fmt --check && forge test` (ci profile), plus the same in `examples/arcade-guild` | contract regressions, the two headline invariants, the example drifting from the core |
| `web` — `tsc --noEmit && lint` | front-end type/ABI drift |
| `docs` — `npm --prefix site run check` | a doc missing from the nav, a dead link, a missing anchor |
| `cli` — `bash packages/create-robinhood-app/test.sh` | see below |

`test.sh` is the scaffold gate. Each assertion is a bug that shipped once:

1. **npm tarball contents** — `bin/index.mjs`, `README.md`, `LICENSE`, `package.json` (0.1.0 went out without LICENSE).
2. **The forge hint** — shown when `forge` is absent, silent when present.
3. **A shell without Foundry on PATH** — the scaffold's `pnpm verify` and `pnpm dryrun` run with `~/.foundry/bin` stripped from PATH; they must find it themselves.
4. **Bare scaffold** — nothing repo-only survives (`apps`, `examples`, `packages`, `site`, `docs.yml`, `PLAN.md`, `GameToken`); `pnpm verify` green; `pnpm dryrun` prints the `tba reward balance` line the tutorial shows.
5. **Fullstack + token scaffold** — install and verify green.
6. **Docs quote the real anvil key** — the account-0 key in `dryrun.sh` must appear verbatim in the example README and guide (a typo cost a debugging loop).

Adding a top-level directory? Add it to the CLI's `rm(...)` list **and** to assertion 4, or the gate fails.

## Stacked PRs

Base every PR on `main` unless it truly needs another PR's changes. If you do stack, merge in order —
**Automatically delete head branches** is on for the repo, so GitHub retargets the next PR to `main`
when its base branch disappears. Without that setting a stacked PR merges into its base *branch* and
`main` silently misses it (it happened once; the fix was a catch-up PR from the last branch to `main`).

## Release checklist

- [ ] `pnpm verify` green locally, including the example
- [ ] `bash packages/create-robinhood-app/test.sh` green (CI runs it too)
- [ ] `npm --prefix site run check` green
- [ ] Any new top-level directory added to the CLI prune list (and `test.sh`)
- [ ] Any new contract function mirrored in `apps/web/lib/abi.ts` and `docs/reference/contracts.md`
- [ ] Any new env var in `docs/reference/configuration.md`
- [ ] `VERIFY` tags: added for any new address, removed only with a source
- [ ] CLI version bumped and published if `bin/index.mjs` changed

## Known drift

Things `PLAN.md` describes that the code does differently. Fix the plan or the code, but know
which is true today:

- `PLAN.md` mentions a `--with-factory` flag and a `template/` directory; the CLI has neither — it
  clones the repo and prunes. `--bare` is the absence of `--fullstack`.
- The spec checkboxes in `PLAN.md` are unticked although every phase shipped.
- `deployments/4663.json` carries a `_comment` key the deploy script will drop on first write.

## Keeping the template fresh

- Foundry libs are git submodules (`contracts/lib/*`); bump with `forge update`, run the gate.
- `apps/web` pins Next 15 / React 19 / wagmi 2 / viem 2; bump in `apps/web/package.json`, then
  `pnpm install && pnpm verify`. Import `injected` from `wagmi`, never `wagmi/connectors`.
- `forge fmt` is not idempotent on long multi-line `if`s — run it twice before `--check`.
