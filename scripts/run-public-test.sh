#!/bin/sh
# SPDX-FileCopyrightText: 2026 Qohesion contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Runs the test edition from this computer and publishes it at https://test.qohesion.app through a Cloudflare Tunnel.
# It stays up only while this computer is awake and this command runs (stop it with Control-C).
#
# One-time setup: `cloudflared tunnel login`, `cloudflared tunnel create qohesion-test`,
# `cloudflared tunnel route dns qohesion-test test.qohesion.app`, and ~/.cloudflared/qohesion-test.yml pointing the
# hostname at http://127.0.0.1:3101. Private settings are the files described in scripts/start-test-edition.sh.
set -eu
cd "$(dirname "$0")/.."
mkdir -p "$HOME/.qohesion-test-data"
chmod 700 "$HOME/.qohesion-test-data"
trap 'kill 0' INT TERM EXIT
QOHESION_ORIGIN=https://test.qohesion.app QOHESION_DATA_DIR="$HOME/.qohesion-test-data" scripts/start-test-edition.sh 3101 &
cloudflared tunnel --config "$HOME/.cloudflared/qohesion-test.yml" run qohesion-test &
wait
