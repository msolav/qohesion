# @qohesion/web

The web application: SvelteKit 3, Svelte 5, TypeScript, Node adapter. It shows the ballot screen in two templates, built from the engine, and reports its version. With `QOHESION_EDITION=test` it also runs the test edition: organizations, polls, voting and results, with ballots stored **without encryption** ([ADR 0007](../../docs/adr/0007-test-edition-and-results-visibility.md)).

## Commands

```sh
npm ci
npm run dev         # development server
npm run typecheck   # svelte-check, warnings fail
npm test            # vitest
npm run build       # production build in build/
npm start           # run the build (PORT, ORIGIN and HOST are read from the environment)
```

## Run the test edition

```sh
npm ci && npm run build
QOHESION_EDITION=test QOHESION_DATA_DIR=./data ORIGIN=http://localhost:3000 npm start
```

Open `http://localhost:3000/start`, create an organization and keep the key it shows once. The database (`qohesion.sqlite`) and the server secret (`secret`) are written to `QOHESION_DATA_DIR`. Deleting that folder erases everything; losing only the secret breaks the personal voting links. In a container: `docker compose -f compose.yml -f compose.test-edition.yml up -d`.

`scripts/start-test-edition.sh [port]` starts the build and reads private settings from files in your home folder (`~/.qohesion-brevo` for the email key, `~/.qohesion-test-gate` for a password in front of the whole test), so no key is typed in a chat or kept in the repository. With an email key set (`QOHESION_BREVO_API_KEY`), an administrator can send each member their personal link from the roll page, after confirming permission to contact them. `scripts/smoke-test-edition.mjs <address>` walks the whole flow against a running server.

`ORIGIN` must be set to the public address when the build runs behind a proxy, so that form posts are accepted.

## What it contains

| Path | Purpose |
|---|---|
| `src/hooks.server.ts` | Chooses the display language and template for each request, remembers an explicit language choice in a functional cookie, adds protective headers. |
| `src/lib/i18n/` | Language negotiation and the interface texts (French and English, same keys, enforced by type and test). |
| `src/lib/ballot.ts` | The preview ballot as an engine form definition. |
| `src/lib/styles/` | Structure (`base.css`), the two templates (`theme-*.css`) and the application shell (`app.css`). Colours come only from custom properties. |
| `src/lib/server/service.ts` | The test edition's storage and rules on SQLite (`node:sqlite`): spaces, keys, polls, the roll, ballots, results and the ledger. Ballots reach the ledger through this one file. |
| `src/lib/results-rules.ts` | Who sees which results and when. Pure, tested, and used by the server on every request. |
| `src/routes/(console)/` | Sign-in, organization creation, and the owner and administrator screens under `/console`. |
| `src/routes/(voter)/` | The ballot templates: preview, personal voting links (`/v/…`), public results (`/r/…`). |
| `src/routes/` | `/` home, `/preview/ballot` the ballot screen with its form action, `/version` the version as JSON, `/changelog` the repository's `CHANGELOG.md` (read with a small parser that produces text, code and link segments only, so no HTML is injected). |

The design rules are in [DESIGN.md](../../DESIGN.md). Interface text follows [docs/content-style.md](../../docs/content-style.md).

## Decisions worth knowing

- **Language.** The address (`?lang=en`) wins over the remembered choice, which wins over the browser setting. French is used when the browser language is neither French nor English. The switcher is made of links and reloads the page, so the language of the document always matches the text. The cookie holds only `fr` or `en`.
- **No script needed.** The ballot form posts to the server, which validates with the engine and answers in the displayed language. JavaScript only upgrades it to an in-page update.
- **Version.** The number comes from the `VERSION` file at the repository root, read by `vite.config.ts` at build time, with the commit and the build time. `/version` returns them as JSON.
- **Source link.** The footer links to the source of the installation, as the AGPL requires for a network service. `QOHESION_SOURCE_URL` (https only, validated at start) replaces the upstream address when an operator publishes a modified copy. Environment variables are declared in `src/env.ts`.
- **Security headers.** `hooks.server.ts` sets `nosniff`, `no-referrer`, `DENY` framing and a restrictive permissions policy. Builds also carry a Content Security Policy that allows only the application's own scripts, styles, fonts and images (development servers inject inline code, so the policy applies to builds only).
- **SvelteKit 3.** Configuration lives in `vite.config.ts`; there is no `svelte.config.js`. Internal imports use `#lib/...` (declared under `imports` in `package.json`). The `@qohesion/engine` package is a `file:` dependency on `packages/engine`, which is plain TypeScript.
- **TypeScript 6.** SvelteKit and svelte-check do not support TypeScript 7 yet, so this package uses 6 while the plain packages use 7. Both check strictly (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
