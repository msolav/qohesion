// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build, sitePageOut } from "../build.mjs";
import { PAGES } from "../site.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "site-build-"));
const pages = build({ repoRoot, outDir, commit: "abc1234", builtAt: "2026-01-01 00:00 UTC" });
const read = (page) => fs.readFileSync(path.join(outDir, page), "utf8");
const page = (id) => PAGES.find((p) => p.id === id);

test("every page of the website exists in both languages", () => {
  for (const p of PAGES) {
    for (const lang of ["fr", "en"]) {
      const out = sitePageOut(p, lang);
      assert.ok(pages.includes(out), `${out} was not built`);
      assert.ok(read(out).includes(`<html lang="${lang}">`), `${out} is not marked ${lang}`);
    }
  }
});

test("every other document in docs/ has a documentation page, and the documents that are pages are not repeated", () => {
  const documents = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith(".md")) documents.push(rel);
    }
  };
  walk("docs");
  const sources = new Set(PAGES.filter((p) => p.source).map((p) => p.source));
  assert.ok(documents.length >= 16, `expected at least 16 documents, found ${documents.length}`);
  const index = read("docs/index.html");
  for (const doc of documents) {
    const out = doc.replace(/\.md$/, ".html");
    if (sources.has(doc)) {
      assert.ok(!pages.includes(out), `${doc} is a page of the website and must not be repeated`);
    } else {
      assert.ok(pages.includes(out), `${doc} has no page`);
      assert.ok(index.includes(`href="${path.posix.relative("docs", out)}"`), `${doc} is missing from the documentation index`);
    }
  }
});

test("each page shows one language only, and the switch leads to the same page in the other language", () => {
  const forbidden = {
    "pricing": { fr: ["Event pass", "The offers"], en: ["Forfait par scrutin", "Les offres"] },
    "terms": { fr: ["Full terms", "In short"], en: ["Conditions complètes", "En bref"] },
    "brand": { fr: ["Permitted without asking", "What this covers"], en: ["Permis sans demande", "Ce que couvre"] },
    "home": { fr: ["Three planned modes", "What exists today"], en: ["Trois modes prévus", "Ce qui existe"] },
  };
  for (const p of PAGES) {
    for (const lang of ["fr", "en"]) {
      const other = lang === "fr" ? "en" : "fr";
      const html = read(sitePageOut(p, lang));
      for (const text of forbidden[p.id]?.[lang] ?? []) assert.ok(!html.includes(text), `${sitePageOut(p, lang)} shows "${text}"`);
      assert.ok(html.includes(`lang="${lang}" aria-label="${lang === "fr" ? "Français" : "English"}" aria-current="true"`), `${p.id} ${lang}: current language is not marked`);
      const href = new RegExp(`<a href="([^"]*)" lang="${other}"`).exec(html)?.[1];
      assert.ok(href, `${p.id} ${lang}: no switch to ${other}`);
      const target = path.join(outDir, path.dirname(sitePageOut(p, lang)), href, "index.html");
      assert.equal(path.relative(outDir, target), sitePageOut(p, other), `${p.id} ${lang}: the switch leads elsewhere`);
    }
  }
});

test("the French and English pricing pages hold the same tables", () => {
  const rows = (html) => (html.match(/<tr>/g) ?? []).length;
  const cells = (html) => (html.match(/<th[ >]/g) ?? []).length;
  const fr = read(sitePageOut(page("pricing"), "fr"));
  const en = read(sitePageOut(page("pricing"), "en"));
  assert.equal(rows(fr), rows(en));
  assert.equal(cells(fr), cells(en));
  for (const html of [fr, en]) {
    assert.ok(html.includes('<table class="compare">') && html.includes('<table class="pricelist">'));
  }
  // The same four prices, written as each language writes them.
  for (const price of ["19", "39", "99", "249"]) {
    assert.ok(en.includes(`$${price}<`) && fr.includes(`${price} $<`), `price ${price} differs between languages`);
  }
});

test("no link inside the site points to a Markdown file, and every one resolves", () => {
  for (const out of pages) {
    const html = read(out);
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      // Links to another site (the source of a page on GitHub, for example) may point to a Markdown file.
      if (/^(https:|mailto:|#)/.test(href)) continue;
      assert.ok(!/\.md(#|$)/.test(href), `${out} links to a Markdown file: ${href}`);
      // The ballot screen preview is published next to the site, not built by it.
      if (/(^|\/)prototype\//.test(href)) continue;
      let file = path.join(outDir, path.dirname(out), href.split("#")[0] ?? "");
      if (href.endsWith("/") || href === "") file = path.join(file, "index.html");
      assert.ok(fs.existsSync(file), `${out} links to ${href}, which was not built`);
    }
  }
});

test("the home page opens with the brand line and links to the preview and to the pricing", () => {
  for (const [lang, h1] of [["fr", "Décidons ensemble."], ["en", "Decide together."]]) {
    const html = read(sitePageOut(page("home"), lang));
    assert.ok(html.includes(`<h1>${h1}</h1>`), `${lang}: the brand line is missing`);
    assert.ok(html.includes(`href="../prototype/?theme=seed-packet&amp;lang=${lang}"`), `${lang}: no link to the ballot screen preview`);
    assert.ok(html.includes(`href="${lang === "fr" ? "../fr/tarifs/" : "../en/pricing/"}"`) || html.includes(`href="${lang === "fr" ? "tarifs/" : "pricing/"}"`), `${lang}: no link to the pricing`);
    assert.ok(html.includes('<table class="facts">'), `${lang}: the modes are not set as rules`);
  }
});

test("every page carries the frame: skip link, navigation, notice and footer", () => {
  for (const out of pages) {
    const html = read(out);
    const lang = /<html lang="(fr|en)">/.exec(html)?.[1];
    assert.ok(lang, `${out} has no language`);
    assert.ok(html.includes('class="skip"') && html.includes('id="main"'), `${out}: no skip link`);
    assert.ok(html.includes('class="notice"'), `${out}: no draft notice`);
    assert.ok(html.includes(lang === "fr" ? "Tarifs</a>" : "Pricing</a>"), `${out}: no pricing link in the navigation`);
    assert.ok(html.includes(lang === "fr" ? "Conditions d’utilisation</a>" : "Terms of use</a>"), `${out}: no terms link in the footer`);
    assert.ok(html.includes(lang === "fr" ? "Nom et logo</a>" : "Name and logo</a>"), `${out}: no brand link in the footer`);
  }
});

test("pages are not indexed, load nothing from another site and carry the build", () => {
  for (const out of pages) {
    const html = read(out);
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), out);
    assert.ok(!/<script/i.test(html), `${out} contains a script`);
    assert.ok(!/(src|href)="https?:\/\/[^"]*\.(css|js|woff2?|svg|png)"/i.test(html), `${out} loads a resource from another site`);
    assert.match(html, /abc1234, 2026-01-01 00:00 UTC/, out);
  }
});

test("a build refuses to overwrite a folder that is not an earlier build", () => {
  const stray = fs.mkdtempSync(path.join(os.tmpdir(), "site-stray-"));
  fs.writeFileSync(path.join(stray, "keep.txt"), "x");
  assert.throws(() => build({ repoRoot, outDir: stray, commit: "x", builtAt: "x" }), /not empty/);
  assert.ok(fs.existsSync(path.join(stray, "keep.txt")));
  assert.throws(() => build({ repoRoot, outDir: repoRoot, commit: "x", builtAt: "x" }), /Refusing/);
});
