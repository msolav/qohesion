// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build, sitePageOut } from "../build.mjs";
import { HARDENING, HOME } from "../home.mjs";
import { PAGES, SOCIAL } from "../site.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "site-build-"));
const pages = build({ repoRoot, outDir, commit: "abc1234", builtAt: "2026-01-01 00:00 UTC", origin: "https://example.org" });
const read = (page) => fs.readFileSync(path.join(outDir, page), "utf8");
const page = (id) => PAGES.find((p) => p.id === id);
const NBSP = " ";

test("French is at the root and English under /en/, for every page of the website", () => {
  assert.equal(sitePageOut(page("home"), "fr"), "index.html");
  assert.equal(sitePageOut(page("home"), "en"), "en/index.html");
  assert.equal(sitePageOut(page("pricing"), "fr"), "tarifs/index.html");
  assert.equal(sitePageOut(page("pricing"), "en"), "en/pricing/index.html");
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
    pricing: { fr: ["Event pass", "The offers"], en: ["Forfait par scrutin", "Les offres"] },
    terms: { fr: ["Full terms", "In short"], en: ["Conditions complètes", "En bref"] },
    brand: { fr: ["Permitted without asking", "What this covers"], en: ["Permis sans demande", "Ce que couvre"] },
    home: { fr: ["Two templates for the ballot screen", "Install on your own server"], en: ["Deux modèles d’écran de vote", "S’installer sur son propre serveur"] },
  };
  for (const p of PAGES) {
    for (const lang of ["fr", "en"]) {
      const other = lang === "fr" ? "en" : "fr";
      const html = read(sitePageOut(p, lang));
      for (const text of forbidden[p.id]?.[lang] ?? []) assert.ok(!html.includes(text), `${sitePageOut(p, lang)} shows "${text}"`);
      assert.ok(html.includes(`lang="${lang}" aria-label="${lang === "fr" ? "Français" : "English"}" aria-current="true"`), `${p.id} ${lang}: current language is not marked`);
      const href = new RegExp(`<a href="([^"]*)" lang="${other}"`).exec(html)?.[1];
      assert.ok(href, `${p.id} ${lang}: no switch to ${other}`);
      const target = path.join(path.dirname(sitePageOut(p, lang)), href.split("?")[0] ?? "", "index.html");
      assert.equal(path.normalize(target), sitePageOut(p, other), `${p.id} ${lang}: the switch leads elsewhere`);
    }
  }
  // Choosing French from an English page must survive the language choice made on the French home page.
  assert.ok(read("en/index.html").includes('href="../?lang=fr"'));
  assert.ok(!read("en/pricing/index.html").includes("?lang=fr"));
});

test("the French and English pricing pages hold the same tables and the same prices", () => {
  const rows = (html) => (html.match(/<tr>/g) ?? []).length;
  const heads = (html) => (html.match(/<th[ >]/g) ?? []).length;
  const fr = read(sitePageOut(page("pricing"), "fr"));
  const en = read(sitePageOut(page("pricing"), "en"));
  assert.equal(rows(fr), rows(en));
  assert.equal(heads(fr), heads(en));
  for (const html of [fr, en]) assert.ok(html.includes('<table class="compare">') && html.includes('<table class="pricelist">'));
  for (const price of ["19", "39", "99", "249"]) {
    assert.ok(en.includes(`$${price}<`), `English price ${price} is missing`);
    assert.ok(fr.includes(`${price}${NBSP}$<`), `French price ${price} is missing or lacks its non-breaking space`);
  }
});

test("no link inside the site points to a Markdown file, and every one resolves", () => {
  for (const out of pages) {
    const html = read(out);
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = (m[1] ?? "").replaceAll("&amp;", "&");
      // Links to another site (the source of a page on GitHub, for example) may point to a Markdown file.
      if (/^(https:|mailto:|#)/.test(href)) continue;
      assert.ok(!/\.md(#|$)/.test(href), `${out} links to a Markdown file: ${href}`);
      // The 404 page is served from any depth, so its links start at the root.
      let file = out === "404.html" ? path.join(outDir, (href.split(/[?#]/)[0] ?? "").replace(/^\//, "")) : path.join(outDir, path.dirname(out), href.split(/[?#]/)[0] ?? "");
      if (href.split(/[?#]/)[0] === "" || href.split(/[?#]/)[0]?.endsWith("/")) file = path.join(file, "index.html");
      assert.ok(fs.existsSync(file), `${out} links to ${href}, which was not built`);
    }
  }
});

test("the home page opens with the brand line and runs the real ballot screen in its frames", () => {
  for (const [lang, h1] of [["fr", "Décidons ensemble."], ["en", "Decide together."]]) {
    const html = read(sitePageOut(page("home"), lang));
    assert.ok(html.includes(`<h1 id="top-title">${h1}</h1>`), `${lang}: the brand line is missing`);
    const frames = [...html.matchAll(/<iframe src="([^"]+)" title="([^"]+)"([^>]*)>/g)];
    assert.equal(frames.length, 2, `${lang}: expected two frames`);
    assert.ok(frames[0]?.[1]?.includes(`prototype/?theme=seed-packet&amp;lang=${lang}`), `${lang}: first frame`);
    assert.ok(frames[1]?.[1]?.includes(`prototype/?theme=ballot-paper&amp;lang=${lang}`), `${lang}: second frame`);
    assert.ok(!frames[0]?.[3]?.includes("lazy") && frames[1]?.[3]?.includes('loading="lazy"'), `${lang}: only the second frame loads lazily`);
    assert.ok(frames.every((f) => (f[2] ?? "").length > 10), `${lang}: a frame has no name`);
    assert.ok(html.includes('href="https://github.com/msolav/qohesion"'), `${lang}: no link to the source`);
    assert.equal((html.match(/<section /g) ?? []).length, 6, `${lang}: expected six sections`);
  }
  assert.ok(fs.existsSync(path.join(outDir, "prototype/index.html")), "the prototype is not part of the build");
  assert.ok(!fs.existsSync(path.join(outDir, "prototype/.DS_Store")));
});

test("what the home page claims is what the repository holds", () => {
  const compose = fs.readFileSync(path.join(repoRoot, "compose.yml"), "utf8");
  const dockerfile = fs.readFileSync(path.join(repoRoot, "Dockerfile"), "utf8");
  for (const line of HARDENING) assert.ok(compose.includes(line) || dockerfile.includes(line), `"${line}" is in neither compose.yml nor the Dockerfile`);
  const ledgerTests = fs.readFileSync(path.join(repoRoot, "packages/ledger/test/receipt-checkpoint.test.ts"), "utf8");
  for (const lang of ["fr", "en"]) assert.ok(ledgerTests.includes(HOME[lang].ledger.code), `the example receipt code is not in the ledger tests`);
  const html = read("index.html");
  assert.ok(html.includes("04HM-ASW9-NF6Y") && html.includes('class="c i0"') && html.includes('class="c i11"'));
  assert.ok(html.includes("read_only: true") && html.includes("cap_drop: [ALL]"));
});

test("every page carries the frame: skip link, navigation, footer, canonical address and metadata", () => {
  for (const out of pages) {
    const html = read(out);
    const lang = /<html lang="(fr|en)">/.exec(html)?.[1];
    assert.ok(lang, `${out} has no language`);
    assert.ok(html.includes('class="skip"') && html.includes('id="main"'), `${out}: no skip link`);
    assert.ok(html.includes(lang === "fr" ? "Tarifs</a>" : "Pricing</a>"), `${out}: no pricing link in the navigation`);
    assert.ok(html.includes(lang === "fr" ? "Conditions d’utilisation</a>" : "Terms of use</a>"), `${out}: no terms link in the footer`);
    assert.ok(html.includes(lang === "fr" ? "Nom et logo</a>" : "Name and logo</a>"), `${out}: no brand link in the footer`);
    for (const account of SOCIAL) assert.ok(html.includes(`<a href="${account.href}">${account.label}</a>`), `${out}: no ${account.label} link in the footer`);
    assert.match(html, /<meta name="description" content="[^"]{20,}">/, `${out}: no description`);
    assert.match(html, /<link rel="canonical" href="https:\/\/example\.org\//, `${out}: no canonical address`);
    assert.ok(html.includes('<meta property="og:title"') && html.includes('rel="icon"') && html.includes('rel="apple-touch-icon"'), `${out}: no share or icon tags`);
    assert.ok(html.includes('<link rel="stylesheet"'), `${out}: no stylesheet`);
  }
  const alternates = read("index.html");
  assert.ok(alternates.includes('hreflang="fr" href="https://example.org/"') && alternates.includes('hreflang="en" href="https://example.org/en/"') && alternates.includes('hreflang="x-default" href="https://example.org/"'));
  assert.ok(read("tarifs/index.html").includes('<link rel="canonical" href="https://example.org/tarifs/">'));
});

test("a page that cannot be found says so in both languages, and its links start at the root", () => {
  const html = read("404.html");
  assert.ok(html.includes("Page introuvable") && html.includes("Page not found"));
  assert.ok(html.includes('href="/site.css"') && html.includes('href="/en/"'));
  assert.ok(!/(src|href)="(?!\/|https:|mailto:|#)/.test(html), "a relative address would break at depth");
});

test("pages are not indexed, load nothing from another site, and only the French home page runs a script", () => {
  for (const out of pages) {
    const html = read(out);
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), out);
    assert.ok(!/(src|href)="https?:\/\/[^"]*\.(css|js|woff2?|svg|png)"/i.test(html), `${out} loads a resource from another site`);
    assert.match(html, /abc1234, 2026-01-01 00:00 UTC/, out);
    const scripts = (html.match(/<script/gi) ?? []).length;
    assert.equal(scripts, out === "index.html" ? 1 : 0, `${out} has ${scripts} script(s)`);
  }
  assert.equal(read("robots.txt"), "User-agent: *\nDisallow: /\n");
  assert.ok(read("index.html").includes('location.replace("en/")'), "the French home page does not choose the language");
});

test("an indexable build drops the noindex tag and lets search engines in", () => {
  const open = fs.mkdtempSync(path.join(os.tmpdir(), "site-open-"));
  build({ repoRoot, outDir: open, commit: "x", builtAt: "x", origin: "https://example.org", indexable: true });
  assert.ok(!fs.readFileSync(path.join(open, "index.html"), "utf8").includes("noindex"));
  assert.equal(fs.readFileSync(path.join(open, "robots.txt"), "utf8"), "User-agent: *\nAllow: /\n");
});

test("a build refuses to overwrite a folder that is not an earlier build", () => {
  const stray = fs.mkdtempSync(path.join(os.tmpdir(), "site-stray-"));
  fs.writeFileSync(path.join(stray, "keep.txt"), "x");
  assert.throws(() => build({ repoRoot, outDir: stray, commit: "x", builtAt: "x" }), /not empty/);
  assert.ok(fs.existsSync(path.join(stray, "keep.txt")));
  assert.throws(() => build({ repoRoot, outDir: repoRoot, commit: "x", builtAt: "x" }), /Refusing/);
});
