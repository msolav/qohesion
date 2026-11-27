#!/bin/sh
# SPDX-FileCopyrightText: 2026 Qohesion contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Starts the test edition from the production build in apps/web (run `npm run build` there first).
#
#   scripts/start-test-edition.sh [port]
#
# Private settings are read from files in your home folder, so that no key or password is typed in a chat or kept in the
# repository. Each file is optional:
#   ~/.qohesion-brevo      one line, BREVO_API_KEY='...'   (turns on email sending of personal voting links)
#   ~/.qohesion-test-gate  the password in front of the whole test (turns the password on)
# Other settings: QOHESION_ORIGIN (the public address, default http://localhost:<port>), QOHESION_DATA_DIR.
set -eu
PORT="${1:-3100}"
cd "$(dirname "$0")/../apps/web"

if [ -f "$HOME/.qohesion-brevo" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.qohesion-brevo"
  export QOHESION_BREVO_API_KEY="${BREVO_API_KEY:-}"
fi
if [ -f "$HOME/.qohesion-test-gate" ]; then
  QOHESION_GATE_PASSWORD="$(head -n 1 "$HOME/.qohesion-test-gate")"
  export QOHESION_GATE_PASSWORD
fi

export QOHESION_EDITION=test
export QOHESION_DATA_DIR="${QOHESION_DATA_DIR:-$PWD/data}"
export PORT HOST=127.0.0.1
export ORIGIN="${QOHESION_ORIGIN:-http://localhost:$PORT}"

# Run from a copy of the build, so that building again while this runs cannot pull its files from under it
# (the server loads parts of itself from disk as pages are first visited).
RELEASE="$HOME/.qohesion-releases/$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$RELEASE"
cp -R build/. "$RELEASE/"

echo "Test edition on $ORIGIN (email: $([ -n "${QOHESION_BREVO_API_KEY:-}" ] && echo on || echo off), password: $([ -n "${QOHESION_GATE_PASSWORD:-}" ] && echo on || echo off))"
exec node "$RELEASE"
