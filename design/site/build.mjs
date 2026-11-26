#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Builds the documents in docs/ into static pages for the development preview.
//   node build.mjs <output directory>
// The output directory must be new, empty, or the result of an earlier build.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, languageSections, outPath, relativeUrl, renderDocument, statusLine, wrapLanguages } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = "https://github.com/msolav/qohesion";
const BLOB = `${REPO}/blob/main`;
const MARKER = ".docs-site-build";

/** Pages with wide tables get a wider sheet. */
const WIDE = new Set(["docs/pricing.md", "docs/glossary.md", "docs/adr/0006-pricing-and-limits.md"]);

const DESCRIPTIONS = {
  "docs/pricing.md": "Draft offers and prices of the hosted service, side by side.",
  "docs/terms-of-use.md": "Draft terms of the hosted service, in French and English.",
  "docs/privacy.md": "Approach to Law 25 (Quebec) and the GDPR.",
  "docs/trademark-policy.md": "Draft policy for the name and logo, in English and French.",
  "docs/legal-review-brief.md": "Questions for legal counsel before the hosted service opens.",
  "docs/glossary.md": "Terms used in the interface and the documents, with the French form.",
  "docs/content-style.md": "Rules for the wording of the interface, emails and documents.",
  "docs/install.md": "Installing the application with Docker Compose.",
  "docs/threat-model.md": "What the software protects against, and what depends on trusting an administrator.",
  "docs/templates/README.md": "Fill-in templates for organizations that install the software.",
};

const GROUPS = [
  { title: "Offers and policies", docs: ["docs/pricing.md", "docs/terms-of-use.md", "docs/privacy.md", "docs/trademark-policy.md", "docs/legal-review-brief.md"] },
  { title: "Product and writing", docs: ["docs/glossary.md", "docs/content-style.md", "docs/install.md", "docs/threat-model.md", "docs/templates/README.md"] },
  { title: "Decisions", prefix: "docs/adr/" },
];

function listDocuments(repoRoot) {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".md")) found.push(rel);
    }
  };
  walk("docs");
  return found.sort();
}

function repoState(repoRoot) {
  const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
  try {
    const commit = git("rev-parse", "--short", "HEAD");
    return git("status", "--porcelain") === "" ? commit : `${commit}, with uncommitted changes`;
  } catch {
    return "unknown";
  }
}

function layout({ title, body, out, lang = "en", wide = false, source = null, build }) {
  const rel = path.posix.relative(path.posix.dirname(out), ".");
  const base = rel === "" ? "" : `${rel}/`;
  const sourceLink = source === null ? `<a href="${REPO}/tree/main/docs">Documents in the repository</a>` : `<a href="${BLOB}/${source}">Source of this page</a>`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Qohesion documents</title>
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#E9E9E3">
<link rel="icon" href="${base}assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}docs.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar">
<a href="${base}index.html"><img src="${base}assets/mark.svg" alt="" width="24" height="24"><span>Documents</span></a>
<a href="${base}../">Development preview</a>
</header>
<p class="draft">Working drafts for review. The content can change before release.</p>
<main id="main" class="sheet${wide ? " wide" : ""}">
${body}
</main>
<footer class="foot">
<span>Built from ${escapeHtml(build.commit)}, ${escapeHtml(build.builtAt)}</span>
${sourceLink}
<a href="${REPO}">Source code</a>
</footer>
</body>
</html>
`;
}

/** Builds every page. Returns the list of pages written. */
export function build({ repoRoot, outDir, commit, builtAt }) {
  const root = path.resolve(repoRoot);
  const out = path.resolve(outDir);
  if (out === root || out === path.parse(out).root) throw new Error(`Refusing to write into ${out}`);
  if (fs.existsSync(out) && fs.readdirSync(out).length > 0 && !fs.existsSync(path.join(out, MARKER))) {
    throw new Error(`${out} is not empty and is not the result of an earlier build`);
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "assets"), { recursive: true });
  fs.writeFileSync(path.join(out, MARKER), "");

  const documents = listDocuments(root);
  const ctx = {
    pages: new Set(documents),
    exists: (p) => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isFile(),
    isDirectory: (p) => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isDirectory(),
    blob: BLOB,
  };
  const info = { commit, builtAt };
  const rendered = [];

  for (const repoPath of documents) {
    const markdown = fs.readFileSync(path.join(root, repoPath), "utf8");
    const { title, html } = renderDocument(markdown, repoPath, ctx);
    const sections = languageSections(html);
    const nav =
      sections.length > 1
        ? `<nav class="langs" aria-label="Language of the text">${sections.map((s) => `<a href="#${s.id}" lang="${s.lang}">${escapeHtml(s.label)}</a>`).join("")}</nav>\n`
        : "";
    const page = layout({
      title,
      body: nav + wrapLanguages(html).replaceAll("<!--lang:en-->", "").replaceAll("<!--lang:fr-->", ""),
      out: outPath(repoPath),
      wide: WIDE.has(repoPath),
      source: repoPath,
      build: info,
    });
    const target = path.join(out, outPath(repoPath));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, page);
    rendered.push({ repoPath, title, status: statusLine(markdown), out: outPath(repoPath) });
  }

  // The index lists every document, in groups; a document that belongs to no group still appears.
  const placed = new Set();
  const groups = GROUPS.map((group) => {
    const members = group.docs ? group.docs : rendered.map((r) => r.repoPath).filter((p) => p.startsWith(group.prefix));
    members.forEach((p) => placed.add(p));
    return { title: group.title, items: members.map((p) => rendered.find((r) => r.repoPath === p)).filter(Boolean) };
  });
  const rest = rendered.filter((r) => !placed.has(r.repoPath));
  if (rest.length > 0) groups.push({ title: "Other", items: rest });

  const list = (items) =>
    `<ul class="docs">\n${items
      .map((r) => {
        const description = DESCRIPTIONS[r.repoPath];
        return `<li><a href="${relativeUrl("index.html", r.out)}">${escapeHtml(r.title)}</a>${description ? `\n<p>${escapeHtml(description)}</p>` : ""}${r.status ? `\n<p class="status">Status: ${escapeHtml(r.status)}</p>` : ""}</li>`;
      })
      .join("\n")}\n</ul>`;
  const indexBody = `<h1>Documents</h1>
<p>Working drafts of the offers, policies and decisions of the project. They are built from the <a href="${REPO}/tree/main/docs">docs folder</a> of the repository and published here to be read and reviewed.</p>
${groups.map((g) => `<h2>${escapeHtml(g.title)}</h2>\n${list(g.items)}`).join("\n")}`;
  fs.writeFileSync(path.join(out, "index.html"), layout({ title: "Documents", body: indexBody, out: "index.html", build: info }));

  fs.copyFileSync(path.join(here, "docs.css"), path.join(out, "docs.css"));
  fs.copyFileSync(path.join(root, "design/prototype/assets/mark.svg"), path.join(out, "assets/mark.svg"));
  fs.copyFileSync(path.join(root, "design/prototype/fonts/figtree-latin.woff2"), path.join(out, "assets/figtree-latin.woff2"));
  fs.copyFileSync(path.join(root, "design/prototype/fonts/OFL-Figtree.txt"), path.join(out, "assets/OFL-Figtree.txt"));

  return ["index.html", ...rendered.map((r) => r.out)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error("Usage: node build.mjs <output directory>");
    process.exit(2);
  }
  const repoRoot = path.resolve(here, "../..");
  const pages = build({
    repoRoot,
    outDir,
    commit: repoState(repoRoot),
    builtAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
  });
  console.log(`Built ${pages.length} pages into ${path.resolve(outDir)}`);
}
