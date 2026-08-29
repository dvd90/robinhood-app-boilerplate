#!/usr/bin/env bash
# Post-scaffold gate — runs in CI (ci.yml `cli`) and before every npm publish.
# A fresh scaffold must install and test green with zero manual steps, from a shell that has NOT
# put Foundry on its PATH. Every assertion below is a bug that shipped once.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
NODE_DIR="$(dirname "$(command -v node)")"
fail() { echo "✖ $*" >&2; exit 1; }

# 1. The npm tarball carries exactly what a user needs (0.1.0 shipped without LICENSE).
FILES="$(cd "$HERE" && npm pack --dry-run --json 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].files.map(f=>f.path).join(" ")))')"
for f in bin/index.mjs README.md LICENSE package.json; do
  [[ " $FILES " == *" $f "* ]] || fail "npm tarball is missing $f (has: $FILES)"
done

# 2. Without Foundry the CLI says what to do; with it, it stays quiet.
cd "$TMP"
OUT="$(PATH="/usr/bin:/bin:$NODE_DIR" node "$HERE/bin/index.mjs" hint-app --template "$REPO" 2>&1)"
grep -q "forge was not found" <<<"$OUT" || fail "CLI did not warn about a missing forge"
OUT="$(node "$HERE/bin/index.mjs" quiet-app --template "$REPO" 2>&1)"
grep -q "forge was not found" <<<"$OUT" && fail "CLI warned about forge although it is on PATH"

# 3. Simulate a shell that never sourced Foundry's PATH line: verify/dryrun must find ~/.foundry/bin
#    on their own. (Where forge lives elsewhere, e.g. CI's toolchain action, the PATH is unchanged.)
FRESH_PATH="$PATH"
if [ -x "$HOME/.foundry/bin/forge" ]; then
  FRESH_PATH="$(tr ':' '\n' <<<"$PATH" | grep -vx "$HOME/.foundry/bin" | paste -sd: -)"
fi

# 4. Bare scaffold: pruned right, gate green, and `pnpm dryrun` prints what the tutorial promises.
node "$HERE/bin/index.mjs" bare-app --bare --template "$REPO"
(
  cd bare-app
  for p in apps examples packages site .github/workflows/docs.yml PLAN.md contracts/src/GameToken.sol pnpm-workspace.yaml; do
    [ ! -e "$p" ] || fail "bare scaffold still contains $p"
  done
  PATH="$FRESH_PATH" pnpm verify
  PATH="$FRESH_PATH" pnpm dryrun | tee dryrun.log
  grep -q "tba reward balance 1000000000000000000000" dryrun.log || fail "dryrun did not print the TBA balance the tutorial shows"
)

# 5. Fullstack scaffold with the token: web gate included.
node "$HERE/bin/index.mjs" full-app --fullstack --with-token --template "$REPO"
(
  cd full-app
  test -f contracts/src/GameToken.sol || fail "--with-token did not keep GameToken"
  test -f apps/web/package.json || fail "--fullstack did not keep apps/web"
  pnpm install --silent
  PATH="$FRESH_PATH" pnpm verify
)

# 6. Docs quote the anvil account-0 key that dryrun.sh uses — a typo here cost a debugging loop.
KEY="$(sed -n 's/^KEY=\(0x[0-9a-fA-F]*\).*/\1/p' "$REPO/contracts/script/dryrun.sh")"
[ -n "$KEY" ] || fail "could not read KEY from contracts/script/dryrun.sh"
for f in examples/arcade-guild/README.md docs/guides/example-arcade-guild.md; do
  grep -q "$KEY" "$REPO/$f" || fail "$f does not use the anvil key from dryrun.sh"
done

echo "create-robinhood-app: tarball, hint, bare, dryrun, fullstack, docs — all green"
