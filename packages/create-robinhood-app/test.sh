#!/usr/bin/env bash
# Post-scaffold gate: a fresh scaffold from the local repo must install and test green with zero manual steps.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"

node "$HERE/bin/index.mjs" bare-app --bare --template "$REPO"
(cd bare-app && test ! -d apps && test ! -d examples && test ! -d packages && test ! -d site && test ! -f .github/workflows/docs.yml && test ! -f contracts/src/GameToken.sol && pnpm verify)

node "$HERE/bin/index.mjs" full-app --fullstack --with-token --template "$REPO"
(cd full-app && test -f contracts/src/GameToken.sol && pnpm install --silent && pnpm verify)

echo "create-robinhood-app: both scaffolds green"
