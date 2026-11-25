# ADR 0001: Stack and deployment

- Status: proposed
- Date: 2026-11-25

## Context

Target installers are volunteers at small organizations, not system administrators. They need one command to install, simple backups and safe upgrades on a low-cost VPS.

## Decision (proposed)

- **TypeScript** end to end, to keep the contributor barrier low.
- **SvelteKit** (Node adapter) for the web app: small bundles, good accessibility primitives, server-rendered by default so the interface works on old phones and weak connections.
- **PostgreSQL** as the only datastore. Row-level constraints enforce one-credential-one-ballot.
- **Docker Compose** as the supported install path: `app` + `postgres` + optional `caddy` for automatic HTTPS. Single image, versioned tags.
- **SMTP** configured by environment variables, with a built-in "send test email" check. No bundled mail server.
- **i18n**: ICU message format, locale files in the repo, plus a database override layer so admins can edit wording without a rebuild.
- **No external network calls** at runtime other than SMTP.

## Consequences

- Easy contribution and hosting, at the cost of requiring Docker.
- Revisit if installers push back on Docker; a plain systemd package is a possible second target.

## Open questions

Choice of ORM/migration tool; crypto library for ballot hashing; whether to support SQLite for tiny instances.
