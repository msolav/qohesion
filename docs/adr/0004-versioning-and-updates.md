# ADR 0004: Versioning and updates

- Status: accepted on 2026-11-26. Accepted to build on, to be revised as the build teaches us.
- Date: 2026-11-25
- Extends: [ADR 0003](0003-three-modes-one-engine.md)

## Context

The software is in alpha. Hosted installations, preview builds and self-hosted installations all need to state which version they run, and self-hosted administrators need to move to a chosen version without losing data. Votes and their verification data must stay checkable across versions.

## Decision

### 1. Scheme

[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html): `MAJOR.MINOR.PATCH`, with an optional prerelease tag (`0.2.0-alpha.1`). Numbers have no leading zeros (`0.1.0`, `0.12.3`).

- **Major 0 means alpha.** Any minor version may change behaviour, configuration or stored data. Patch versions fix defects and do not change data formats.
- **1.0.0** is declared when the verifiable tally, the update procedure and the data formats are stable. After 1.0.0, minor versions are backward compatible and breaking changes need a new major version.
- Displayed form: `v0.1.0 (alpha)`.

### 2. One source of truth

- The `VERSION` file at the repository root declares the version once. Each package's `package.json` repeats it, and a script (`scripts/check-version.mjs`) fails the build when they differ or when the version is invalid.
- A release is a Git tag `vMAJOR.MINOR.PATCH` on the main branch, with a GitHub Release whose text is the matching section of `CHANGELOG.md`.
- `CHANGELOG.md` follows Keep a Changelog. Each entry lists added, changed, fixed and removed items, and an "Upgrade notes" section for anything an administrator must do or any data change.

### 3. Visibility

- Every interface shows the version in its footer (`v0.1.0 (alpha)`), with the short build identifier in the hosted and preview builds.
- A `/version` endpoint returns the version, channel, commit and build date as JSON.
- A changelog page renders `CHANGELOG.md`. Entries are in English first; French follows when the translation tools exist.

### 4. Updates for self-hosted installations

- Container images are published with the exact version as tag (for example `ghcr.io/msolav/qohesion:0.1.0`) and an `edge` tag for the main branch. There is no `latest` tag during alpha, so that no installation moves to a new version without a decision. The image name is proposed and depends on the publishing setup.
- The administrator pins a version in the configuration file and changes it to update.
- An update command (`qohesion update --to 0.2.0`) does the following:
  1. assesses the move (the engine's `assessUpdate`): direction, skipped minor versions, compatibility warnings;
  2. refuses a downgrade;
  3. takes a backup of the database and configuration;
  4. applies the database migrations in order, each in a transaction, forward only;
  5. checks that the application starts and reports the new version;
  6. on failure, restores the backup and keeps the previous version.
- The way back after a completed update is to restore the backup taken before it and start the previous version. Migrations are not reversed.
- Support policy during alpha: only the latest minor version receives fixes. Skipping minor versions is allowed but warned about, and the update command applies every migration in between.
- Security fixes are released as patch versions with a published advisory.

### 5. Data formats are versioned separately

Exported data, ballot records and verification transcripts carry their own `formatVersion`, independent of the application version. The independent verifier supports every past format, so that an old election can be checked with a new tool. A format change is listed in the changelog's upgrade notes.

### 6. Update notices

The application makes no network call to check for updates by default (see [ADR 0001](0001-stack-and-deployment.md): no external calls other than email). An administrator can enable a check against the project's release feed in the settings, or subscribe to the feed (`releases.atom`) outside the application.

### 7. Hosted service and preview

Each change reaches the development preview first, then production. The footer of each shows the version and build. Hosted updates keep the same migration rules; a failed migration stops the rollout.

## Consequences

- The update command and migrations are part of the first self-hosted release, not an afterthought.
- Treating data formats as versioned from the start costs little now and avoids unreadable archives later.
- Refusing downgrades is safer for data but means a bad release is answered by a restore, so backups must be tested.

## Open questions

Whether to publish a `0.x` floating tag that follows patch releases. The retention period for old image tags. Whether the hosted service shows the changelog to organization owners at each update.
