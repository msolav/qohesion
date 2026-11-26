// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  docOutPath,
  hasLanguageSections,
  pageUrl,
  renderDocument,
  resolveHref,
  slugify,
  splitLanguage,
  statusLine,
} from "../lib.mjs";

const BLOB = "https://github.com/example/repo/blob/main";
const files = new Set(["LICENSING.md", "LICENSES/brand.txt", "docs/a.md", "docs/adr/0001.md", "docs/templates/README.md", "docs/pricing.md"]);
const ctx = {
  // docs/pricing.md is a page of the site: it has one page per language.
  outFor: (p) => {
    if (p === "docs/pricing.md") return "en/pricing/index.html";
    return ["docs/a.md", "docs/adr/0001.md", "docs/templates/README.md"].includes(p) ? docOutPath(p) : null;
  },
  siteLink: (name) => (name === "prototype" ? "prototype/?theme=seed-packet&lang=en" : null),
  exists: (p) => files.has(p),
  isDirectory: (p) => p === "docs/templates" || p === "docs/templates/",
  blob: BLOB,
};
const link = (href, from = "docs/a.md", out = docOutPath(from)) => resolveHref(href, from, out, ctx);
const render = (md, options) => renderDocument(md, "docs/a.md", "docs/a.html", ctx, options);

test("slugify removes accents and punctuation", () => {
  assert.equal(slugify("Français"), "francais");
  assert.equal(slugify("Roll size, & more!"), "roll-size-more");
  assert.equal(slugify("  --  "), "");
});

test("docOutPath keeps the path of a document and refuses anything else", () => {
  assert.equal(docOutPath("docs/glossary.md"), "docs/glossary.html");
  assert.equal(docOutPath("docs/adr/0006-x.md"), "docs/adr/0006-x.html");
  assert.throws(() => docOutPath("README.md"));
  assert.throws(() => docOutPath("docs/image.png"));
});

test("pageUrl is written from the page that links, and names a folder for an index page", () => {
  assert.equal(pageUrl("docs/adr/0006.html", "docs/glossary.html"), "../glossary.html");
  assert.equal(pageUrl("docs/adr/0006.html", "docs/adr/0003.html"), "0003.html");
  assert.equal(pageUrl("fr/index.html", "fr/tarifs/index.html"), "tarifs/");
  assert.equal(pageUrl("fr/tarifs/index.html", "fr/index.html"), "../");
  assert.equal(pageUrl("fr/index.html", "fr/index.html"), "./");
  assert.equal(pageUrl("docs/adr/0006.html", "en/pricing/index.html"), "../../en/pricing/");
});

test("https and mailto links are kept, other schemes are refused", () => {
  assert.equal(link("https://example.org/x?y=1"), "https://example.org/x?y=1");
  assert.equal(link("mailto:info@example.org"), "mailto:info@example.org");
  assert.throws(() => link("http://example.org"), /unsupported link/);
  assert.throws(() => link("javascript:alert(1)"), /unsupported link/);
  assert.throws(() => link("//evil.example/x"), /unsupported link/);
  assert.throws(() => link("data:text/html,x"), /unsupported link/);
});

test("a link to a document becomes a link to its page, with its anchor", () => {
  assert.equal(link("adr/0001.md"), "adr/0001.html");
  assert.equal(link("../a.md#part", "docs/adr/0001.md"), "../a.html#part");
  assert.equal(link("#here"), "#here");
});

test("a link to a page of the site goes to the page in the language of the page that links", () => {
  assert.equal(link("pricing.md", "docs/a.md", "docs/a.html"), "../en/pricing/");
});

test("a link to the ballot screen preview is written from the page that links", () => {
  assert.equal(link("site:prototype", "docs/_home.md", "en/index.html"), "../prototype/?theme=seed-packet&lang=en");
  assert.throws(() => link("site:nowhere"), /unknown site link/);
});

test("a link to a directory goes to its README page", () => {
  assert.equal(link("templates/"), "templates/README.html");
  assert.equal(link("templates/README.md"), "templates/README.html");
});

test("a link to another file of the repository points to that file on GitHub", () => {
  assert.equal(link("../LICENSING.md"), `${BLOB}/LICENSING.md`);
  assert.equal(link("../../LICENSES/brand.txt", "docs/adr/0001.md"), `${BLOB}/LICENSES/brand.txt`);
});

test("a link to a missing file, or outside the repository, stops the build", () => {
  assert.throws(() => link("missing.md"), /does not exist/);
  assert.throws(() => link("../../../etc/passwd"), /leaves the repository/);
});

test("statusLine keeps the first sentence and drops links", () => {
  assert.equal(statusLine("# T\n\n- Status: accepted on 2026-11-26. Open to revision.\n"), "Accepted on 2026-11-26");
  assert.equal(statusLine("Status: draft, not yet reviewed. It extends [the notice](x.md).\n"), "Draft, not yet reviewed");
  assert.equal(statusLine("Status: draft.\n"), "Draft");
  assert.equal(statusLine("# No status here\n"), null);
});

const BILINGUAL = "# Title / Titre\n\n## English\n\nEnglish intro.\n\n### Part\n\nText.\n\n#### Detail\n\nMore.\n\n---\n\n## Français\n\nIntro française.\n\n### Partie\n\nTexte.\n\n---\n";

test("a section is kept alone, and its headings move up one level", () => {
  assert.ok(hasLanguageSections(BILINGUAL));
  const en = splitLanguage(BILINGUAL, "en");
  assert.ok(en.startsWith("English intro."), en);
  assert.ok(en.includes("\n## Part\n") && en.includes("\n### Detail\n"), en);
  assert.ok(!en.includes("Français") && !en.includes("Partie"), en);
  assert.ok(!/---\s*$/.test(en), "the closing rule is dropped");
  const fr = splitLanguage(BILINGUAL, "fr");
  assert.ok(fr.startsWith("Intro française."), fr);
  assert.ok(fr.includes("\n## Partie\n") && !fr.includes("English"), fr);
});

test("a document with no language sections is kept whole, and a missing language is an error", () => {
  const plain = "# Title\n\n### Part\n\nText.\n";
  assert.equal(hasLanguageSections(plain), false);
  assert.equal(splitLanguage(plain, "en"), plain);
  assert.throws(() => splitLanguage("## English\n\nOnly English.\n", "fr"), /no "fr" section/);
});

test("a heading inside a code block is not mistaken for a language heading", () => {
  const md = "## English\n\n```\n## Français\n```\n\nText.\n";
  const en = splitLanguage(md, "en");
  assert.ok(en.includes("## Français"), en);
});

test("raw HTML in a document is shown as text and never becomes markup", () => {
  const { html } = render("# T\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n");
  assert.ok(!html.includes("<script"), html);
  assert.ok(!html.includes("<img"), html);
  assert.ok(html.includes("&lt;script&gt;"), html);
});

test("a broken link or an image stops the build", () => {
  assert.throws(() => render("[x](nowhere.md)"), /does not exist/);
  assert.throws(() => render("![logo](logo.png)"), /images are not supported/);
});

test("the title is the first level-1 heading and repeated headings get distinct ids", () => {
  const { title, html } = render("# Pricing (draft)\n\n## Open\n\n## Open\n");
  assert.equal(title, "Pricing (draft)");
  assert.ok(html.includes('id="open"') && html.includes('id="open-2"'), html);
  assert.equal(render("No heading at all.\n").title, null);
});

test("tables scroll in their own region, take the class given to them, and name their rows", () => {
  const md = "| | A | B |\n|---|---|---|\n| Price | 1 | 2 |\n\n| X | Y |\n|---|---|\n| 1 | 2 |\n";
  const { html } = render(md, { tableClasses: ["compare", "pricelist"] });
  assert.equal((html.match(/class="table-wrap"/g) ?? []).length, 2);
  assert.ok(html.includes('<table class="compare">') && html.includes('<table class="pricelist">'), html);
  assert.ok(html.includes('<th scope="row">Price</th>'), html);
  assert.ok(html.includes('<span class="sr-only">Item</span>'), html);
  assert.ok(render(md).html.includes("<table>"), "a table with no class stays plain");
});
