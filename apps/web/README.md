# @qohesion/web

The web application: SvelteKit 3, Svelte 5, TypeScript, Node adapter. This build is a skeleton. It shows the ballot screen in two templates, built from the engine, and reports its version. No ballot is recorded yet.

## Commands

```sh
npm ci
npm run dev         # development server
npm run typecheck   # svelte-check, warnings fail
npm test            # vitest
npm run build       # production build in build/
npm start           # run the build (PORT, ORIGIN and HOST are read from the environment)
```

`ORIGIN` must be set to the public address when the build runs behind a proxy, so that form posts are accepted.

## What it contains

| Path | Purpose |
|---|---|
| `src/hooks.server.ts` | Chooses the display language and template for each request, remembers an explicit language choice in a functional cookie, adds protective headers. |
| `src/lib/i18n/` | Language negotiation and the interface texts (French and English, same keys, enforced by type and test). |
| `src/lib/ballot.ts` | The preview ballot as an engine form definition. |
| `src/lib/styles/` | Structure (`base.css`), the two templates (`theme-*.css`) and the application shell (`app.css`). Colours come only from custom properties. |
| `src/routes/` | `/` home, `/preview/ballot` the ballot screen with its form action, `/version` the version as JSON. |

The design rules are in [DESIGN.md](../../DESIGN.md). Interface text follows [docs/content-style.md](../../docs/content-style.md).

## Decisions worth knowing

- **Language.** The address (`?lang=en`) wins over the remembered choice, which wins over the browser setting. French is used when the browser language is neither French nor English. The switcher is made of links and reloads the page, so the language of the document always matches the text. The cookie holds only `fr` or `en`.
- **No script needed.** The ballot form posts to the server, which validates with the engine and answers in the displayed language. JavaScript only upgrades it to an in-page update.
- **Version.** The number comes from the `VERSION` file at the repository root, read by `vite.config.ts` at build time, with the commit and the build time. `/version` returns them as JSON.
- **Security headers.** `hooks.server.ts` sets `nosniff`, `no-referrer`, `DENY` framing and a restrictive permissions policy. Builds also carry a Content Security Policy that allows only the application's own scripts, styles, fonts and images (development servers inject inline code, so the policy applies to builds only).
- **SvelteKit 3.** Configuration lives in `vite.config.ts`; there is no `svelte.config.js`. Internal imports use `#lib/...` (declared under `imports` in `package.json`). The `@qohesion/engine` package is a `file:` dependency on `packages/engine`, which is plain TypeScript.
- **TypeScript 6.** SvelteKit and svelte-check do not support TypeScript 7 yet, so this package uses 6 while the plain packages use 7. Both check strictly (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
