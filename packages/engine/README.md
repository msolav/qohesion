# @qohesion/engine

Question and form engine shared by ballots and the setup wizard. Plain TypeScript, no framework dependency, so the web application, the light mode and self-hosted installations use the same code.

- **Questions:** single choice, multiple choice, text, number, colour (with contrast rules), toggle.
- **Forms:** ordered steps, conditional visibility, validation with error codes, a list of untranslated texts.
- **Versions:** parsing, comparison, release channel, display text and assessment of an update.

```sh
npm ci
npm run typecheck
npm test
```
