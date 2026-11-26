// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  languageSections,
  outPath,
  relativeUrl,
  renderDocument,
  resolveHref,
  slugify,
  statusLine,
  wrapLanguages,
} from "../lib.mjs";

const BLOB = "https://github.com/example/repo/blob/main";
const files = new Set(["LICENSING.md", "LICENSES/brand.txt", "docs/a.md", "docs/adr/0001.md", "docs/templates/README.md"]);
const ctx = {
  pages: new Set(["docs/a.md", "docs/adr/0001.md", "docs/templates/README.md"]),
  exists: (p) => files.has(p),
  isDirectory: (p) => p === "docs/templates" || p === "docs/templates/",
  blob: BLOB,
};

test("slugify removes accents and punctuation", () => {
  assert.equal(slugify("Français"), "francais");
  assert.equal(slugify("Roll size, & more!"), "roll-size-more");
  assert.equal(slugify("  --  "), "");
});

test("outPath maps a document to its page and refuses anything else", () => {
  assert.equal(outPath("docs/pricing.md"), "pricing.html");
  assert.equal(outPath("docs/adr/0006-x.md"), "adr/0006-x.html");
  assert.throws(() => outPath("README.md"));
  assert.throws(() => outPath("docs/image.png"));
});

test("relativeUrl is written from the page that links", () => {
  assert.equal(relativeUrl("adr/0006.html", "pricing.html"), "../pricing.html");
  assert.equal(relativeUrl("index.html", "adr/0006.html"), "adr/0006.html");
  assert.equal(relativeUrl("adr/0006.html", "adr/0003.html"), "0003.html");
});

test("https and mailto links are kept, other schemes are refused", () => {
  assert.equal(resolveHref("https://example.org/x?y=1", "docs/a.md", ctx), "https://example.org/x?y=1");
  assert.equal(resolveHref("mailto:info@example.org", "docs/a.md", ctx), "mailto:info@example.org");
  assert.throws(() => resolveHref("http://example.org", "docs/a.md", ctx), /unsupported link/);
  assert.throws(() => resolveHref("javascript:alert(1)", "docs/a.md", ctx), /unsupported link/);
  assert.throws(() => resolveHref("//evil.example/x", "docs/a.md", ctx), /unsupported link/);
  assert.throws(() => resolveHref("data:text/html,x", "docs/a.md", ctx), /unsupported link/);
});

test("a link to a document becomes a link to its page, with its anchor", () => {
  assert.equal(resolveHref("adr/0001.md", "docs/a.md", ctx), "adr/0001.html");
  assert.equal(resolveHref("../a.md#part", "docs/adr/0001.md", ctx), "../a.html#part");
  assert.equal(resolveHref("#here", "docs/a.md", ctx), "#here");
});

test("a link to a directory goes to its README page", () => {
  assert.equal(resolveHref("templates/", "docs/a.md", ctx), "templates/README.html");
  assert.equal(resolveHref("templates/README.md", "docs/a.md", ctx), "templates/README.html");
});

test("a link to another file of the repository points to that file on GitHub", () => {
  assert.equal(resolveHref("../LICENSING.md", "docs/a.md", ctx), `${BLOB}/LICENSING.md`);
  assert.equal(resolveHref("../../LICENSES/brand.txt", "docs/adr/0001.md", ctx), `${BLOB}/LICENSES/brand.txt`);
});

test("a link to a missing file, or outside the repository, stops the build", () => {
  assert.throws(() => resolveHref("missing.md", "docs/a.md", ctx), /does not exist/);
  assert.throws(() => resolveHref("../../../etc/passwd", "docs/a.md", ctx), /leaves the repository/);
});

test("statusLine keeps the first sentence and drops links", () => {
  assert.equal(statusLine("# T\n\n- Status: accepted on 2026-11-26. Open to revision.\n"), "Accepted on 2026-11-26");
  assert.equal(statusLine("Status: draft, not yet reviewed. It extends [the notice](x.md).\n"), "Draft, not yet reviewed");
  assert.equal(statusLine("Status: draft.\n"), "Draft");
  assert.equal(statusLine("# No status here\n"), null);
});

test("raw HTML in a document is shown as text and never becomes markup", () => {
  const { html } = renderDocument("# T\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n", "docs/a.md", ctx);
  assert.ok(!html.includes("<script"), html);
  assert.ok(!html.includes("<img"), html);
  assert.ok(html.includes("&lt;script&gt;"), html);
});

test("a broken link or an image stops the build", () => {
  assert.throws(() => renderDocument("[x](nowhere.md)", "docs/a.md", ctx), /does not exist/);
  assert.throws(() => renderDocument("![logo](logo.png)", "docs/a.md", ctx), /images are not supported/);
});

test("the title is the first level-1 heading and repeated headings get distinct ids", () => {
  const { title, html } = renderDocument("# Pricing (draft)\n\n## Open\n\n## Open\n", "docs/a.md", ctx);
  assert.equal(title, "Pricing (draft)");
  assert.ok(html.includes('id="open"') && html.includes('id="open-2"'), html);
});

test("tables are wrapped to scroll, and the first cell of a row names the row", () => {
  const { html } = renderDocument("| | A | B |\n|---|---|---|\n| Price | 1 | 2 |\n", "docs/a.md", ctx);
  assert.ok(html.includes('class="table-wrap"'), html);
  assert.ok(html.includes('<th scope="row">Price</th>'), html);
  assert.ok(html.includes('<span class="sr-only">Item</span>'), html);
});

test("each language section carries its language", () => {
  const { html } = renderDocument("# T\n\n## English\n\nText.\n\n## Français\n\nTexte.\n", "docs/a.md", ctx);
  assert.deepEqual(
    languageSections(html).map((s) => [s.lang, s.id]),
    [["en", "english"], ["fr", "francais"]],
  );
  const wrapped = wrapLanguages(html);
  assert.ok(wrapped.includes('<section lang="en"><h2 id="english">'), wrapped);
  assert.ok(wrapped.includes('<section lang="fr"><h2 id="francais">'), wrapped);
  assert.equal((wrapped.match(/<section /g) ?? []).length, 2);
});

test("a rule before a language heading is dropped, other rules stay", () => {
  const { html } = renderDocument("# T\n\nIntro.\n\n---\n\n## English\n\nText.\n\n---\n\n## Français\n\nTexte.\n\n---\n\nEnd.\n", "docs/a.md", ctx);
  assert.equal((html.match(/<hr>/g) ?? []).length, 1, html);
  assert.ok(html.trimEnd().includes("<hr>\n<p>End.</p>"), html);
});
