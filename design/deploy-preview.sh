#!/usr/bin/env bash
# Publish the website to the development preview (https://dev.qohesion.app), behind a password.
#
# The preview is the Cloudflare Worker "qohesion-dev": design/site/gate/_worker.js checks the password on every
# request, then serves the built website as static assets. The password is the Worker's secret GATE_PASSWORD. It is
# never in this repository, and without it nothing is served. To change it:
#   wrangler secret put GATE_PASSWORD --name qohesion-dev
#
# Usage: design/deploy-preview.sh      (needs Node 22 or later, and wrangler logged in to the Cloudflare account)
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
WRANGLER="${WRANGLER:-wrangler}"

# Build first, so that a failure stops the publication before anything changes.
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
(cd "$SRC/design/site" && npm ci --ignore-scripts --no-audit --no-fund --silent && node build.mjs "$WORK/site")
rm -f "$WORK/site/.site-build"

# The gate and its configuration sit beside the site, not inside it.
cp "$SRC/design/site/gate/_worker.js" "$WORK/_worker.js"
sed "s#__ASSETS__#$WORK/site#" "$SRC/design/site/gate/wrangler.toml" > "$WORK/wrangler.toml"

COMMIT="$(git -C "$SRC" rev-parse --short HEAD)"
"$WRANGLER" deploy --config "$WORK/wrangler.toml" --message "Preview build $COMMIT"
echo "Published preview build ${COMMIT} to dev.qohesion.app"
