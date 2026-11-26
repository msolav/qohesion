# Install with Docker Compose

Status: alpha. This build contains the ballot screen preview and the version information. It records no ballot, stores no data and sends no email, so there is nothing to back up yet. The instructions below describe how the application is run, and will grow with it (database, HTTPS proxy, email settings).

## Requirements

- A server with Docker Engine 24 or later and the Compose plugin.
- A public address for the installation (for example `https://vote.example.org`) that reaches the server through an HTTPS reverse proxy. The application itself speaks HTTP on port 3000 and listens on `127.0.0.1` only.

## Steps

1. Download the source at the version to install (a Git tag such as `v0.1.0`), or clone the repository and check out the tag.
2. Build and start the application, giving its public address:

   ```sh
   ORIGIN=https://vote.example.org QOHESION_COMMIT=$(git rev-parse HEAD) docker compose up -d --build
   ```

   `ORIGIN` is required. Form submissions are refused without it, because the application checks that they come from its own address.
3. Point the HTTPS reverse proxy at `127.0.0.1:3000`.
4. Check the installation: `https://vote.example.org/version` returns the version, release channel, commit and build date as JSON.

## Choosing and changing the version

The image is tagged with the exact version (`qohesion:0.1.0`). There is no `latest` tag during alpha, so that an installation never moves to a new version without a decision. To change the version, check out the new tag and run step 2 again. The documented update command, with backup, ordered migrations and restore on failure, is planned (see [ADR 0004](adr/0004-versioning-and-updates.md)). Until it exists, no data needs migrating.

## What the container does

- Runs as the unprivileged user `node`, with a read-only file system, no Linux capabilities and `no-new-privileges`.
- Makes no network call other than answering requests: no external fonts, scripts or telemetry.
- Reports its health at `/version`; Docker marks it unhealthy after three failed checks.

## Licence note

The application is licensed under the AGPL-3.0-or-later. A modified version that is offered to users over a network must offer those users its source code. The footer of each page links to the source for this reason. If the code is changed, set `QOHESION_SOURCE_URL` to the address (https) where the changed source is published; the link then points there. Without it, the link points to the upstream repository.
