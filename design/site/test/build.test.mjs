// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "../build.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-site-"));
const pages = build({ repoRoot, outDir, commit: "abc1234", builtAt: "2026-01-01 00:00 UTC" });
const read = (page) => fs.readFileSync(path.join(outDir, page), "utf8");

test("every document in docs/ becomes a page, and the index lists them all", () => {
  const documents = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith(".md")) documents.push(rel);
    }
  };
  walk("docs");
  assert.ok(documents.length >= 16, `expected at least 16 documents, found ${documents.length}`);
  assert.equal(pages.length, documents.length + 1);
  const index = read("index.html");
  for (const page of pages.filter((p) => p !== "index.html")) {
    assert.ok(index.includes(`href="${page}"`), `${page} is missing from the index`);
    assert.ok(fs.existsSync(path.join(outDir, page)), `${page} was not written`);
  }
});

test("no link inside the site points to a Markdown file, and every one resolves", () => {
  for (const page of pages) {
    const html = read(page);
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      // Links to another site (the source of a page on GitHub, for example) may point to a Markdown file.
      if (/^(https:|mailto:|#)/.test(href)) continue;
      assert.ok(!/\.md(#|$)/.test(href), `${page} links to a Markdown file: ${href}`);
      const file = path.join(outDir, path.dirname(page), href.split("#")[0] ?? "");
      assert.ok(fs.existsSync(file), `${page} links to ${href}, which was not built`);
    }
  }
});

test("pages are not indexed, load nothing from another site and carry the build", () => {
  for (const page of pages) {
    const html = read(page);
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'), page);
    assert.ok(!/<script/i.test(html), `${page} contains a script`);
    assert.ok(!/(src|href)="https?:\/\/[^"]*\.(css|js|woff2?)"/i.test(html), `${page} loads a resource from another site`);
    assert.ok(html.includes("Built from abc1234, 2026-01-01 00:00 UTC"), page);
  }
});

test("the pricing page keeps its tables, and a bilingual document marks both languages", () => {
  assert.ok((read("pricing.html").match(/<table>/g) ?? []).length >= 2);
  const policy = read("trademark-policy.html");
  assert.ok(policy.includes('<section lang="en">') && policy.includes('<section lang="fr">'));
  assert.ok(policy.includes('<nav class="langs"'));
});

test("a build refuses to overwrite a folder that is not an earlier build", () => {
  const stray = fs.mkdtempSync(path.join(os.tmpdir(), "docs-stray-"));
  fs.writeFileSync(path.join(stray, "keep.txt"), "x");
  assert.throws(() => build({ repoRoot, outDir: stray, commit: "x", builtAt: "x" }), /not empty/);
  assert.ok(fs.existsSync(path.join(stray, "keep.txt")));
  assert.throws(() => build({ repoRoot, outDir: repoRoot, commit: "x", builtAt: "x" }), /Refusing/);
});
