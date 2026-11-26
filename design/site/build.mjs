#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Builds the website preview: the pages in French and English, and the documentation.
//   node build.mjs <output directory>
// The output directory must be new, empty, or the result of an earlier build.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docOutPath, escapeHtml, pageUrl, renderDocument, resolveHref, splitLanguage, statusLine } from "./lib.mjs";
import { DOC_DESCRIPTIONS, DOC_GROUPS, LANGS, PAGES, STRINGS, WIDE_DOCS } from "./site.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = "https://github.com/msolav/qohesion";
const BLOB = `${REPO}/blob/main`;
const MARKER = ".site-build";
/** Links in the home texts are written as if the text sat in docs/, so that "pricing.md" finds the pricing page. */
const HOME_PATH = "docs/_home.md";

/** Where a page of the website is written, relative to the site root. */
export function sitePageOut(page, lang) {
  const slug = page.slug[lang];
  return slug === "" ? `${lang}/index.html` : `${lang}/${slug}/index.html`;
}

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

function layout({ lang, title, head, body, out, alt = null, current = null, wide = false, home = false, source, build }) {
  const t = STRINGS[lang];
  const rel = path.posix.relative(path.posix.dirname(out), ".");
  const base = rel === "" ? "" : `${rel}/`;
  const find = (id) => PAGES.find((p) => p.id === id);
  const link = (page) => pageUrl(out, sitePageOut(page, lang));

  const nav = [
    { label: t.pricing, href: link(find("pricing")), here: current === "pricing" },
    { label: t.docsNav, href: pageUrl(out, "docs/index.html"), here: current === "docs" },
  ];
  const switcher = alt
    ? `<nav class="lang" aria-label="${escapeHtml(t.langLabel)}">${LANGS.map((l) => {
        const label = l === "fr" ? "Français" : "English";
        return l === lang
          ? `<a href="${pageUrl(out, alt[l])}" lang="${l}" aria-label="${label}" aria-current="true">${l.toUpperCase()}</a>`
          : `<a href="${pageUrl(out, alt[l])}" lang="${l}" aria-label="${label}">${l.toUpperCase()}</a>`;
      }).join("")}</nav>`
    : "";
  const footerLinks = [
    ...PAGES.filter((p) => p.footer).map((p) => ({ label: p.title[lang], href: link(p) })),
    { label: t.docs, href: pageUrl(out, "docs/index.html") },
    { label: t.sourceCode, href: REPO },
  ];

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Qohesion</title>
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#EEF3E9">
<link rel="icon" href="${base}assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}site.css">
</head>
<body${home ? ' class="home"' : ""}>
<a class="skip" href="#main">${escapeHtml(t.skip)}</a>
<header class="top">
<a class="logo" href="${pageUrl(out, sitePageOut(find("home"), lang))}" aria-label="${escapeHtml(t.homeLabel)}"><img src="${base}assets/logo.svg" alt="Qohesion" width="155" height="28"></a>
<nav class="nav" aria-label="${escapeHtml(t.navLabel)}">
${nav.map((n) => `<a href="${n.href}"${n.here ? ' aria-current="page"' : ""}>${escapeHtml(n.label)}</a>`).join("\n")}
</nav>
${switcher}
</header>
<p class="notice">${escapeHtml(t.notice)}</p>
<div class="page${wide ? " wide" : ""}">
<main id="main">
<div class="head">
${head}
</div>
<div class="slip">
${body}
</div>
</main>
</div>
<footer class="foot">
<nav aria-label="${escapeHtml(t.navLabel)}">
${footerLinks.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join("\n")}
</nav>
<p>${escapeHtml(t.built)} ${escapeHtml(build.commit)}, ${escapeHtml(build.builtAt)}. <a href="${source.href}">${escapeHtml(source.label ?? t.pageSource)}</a></p>
</footer>
</body>
</html>
`;
}

/** The title heading of a page, and the paragraphs that follow it up to the first section (the home page's opening). */
function takeOpening(html, { withParagraphs }) {
  const h1 = /^<h1 id="[^"]*">([\s\S]*?)<\/h1>\n?/.exec(html);
  if (!h1) return { opening: "", rest: html };
  let rest = html.slice(h1[0].length);
  let opening = `<h1>${h1[1]}</h1>`;
  if (withParagraphs) {
    const at = rest.indexOf("<h2");
    const paragraphs = at === -1 ? rest : rest.slice(0, at);
    opening += `\n${paragraphs.trim()}`;
    rest = at === -1 ? "" : rest.slice(at);
  }
  return { opening, rest };
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

  const info = { commit, builtAt };
  const documents = listDocuments(root);
  const siteSources = new Set(PAGES.filter((p) => p.source).map((p) => p.source));
  const docPages = documents.filter((d) => !siteSources.has(d));
  const written = [];
  const write = (page, html) => {
    const target = path.join(out, page);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
    written.push(page);
  };

  const makeCtx = (lang) => ({
    outFor: (repoPath) => {
      const page = PAGES.find((p) => p.source === repoPath);
      if (page) return sitePageOut(page, lang);
      return docPages.includes(repoPath) ? docOutPath(repoPath) : null;
    },
    siteLink: (name) => (name === "prototype" ? `prototype/?theme=seed-packet&lang=${lang}` : null),
    exists: (p) => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isFile(),
    isDirectory: (p) => fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isDirectory(),
    blob: BLOB,
  });

  // The website: each page in each language.
  for (const lang of LANGS) {
    const ctx = makeCtx(lang);
    for (const page of PAGES) {
      const pageOut = sitePageOut(page, lang);
      const alt = Object.fromEntries(LANGS.map((l) => [l, sitePageOut(page, l)]));
      const home = page.id === "home";
      const sourcePath = home ? `${page.content}.${lang}.md` : page.source;
      const markdown = splitLanguage(fs.readFileSync(path.join(root, sourcePath), "utf8"), lang);
      const { html } = renderDocument(markdown, home ? HOME_PATH : page.source, pageOut, ctx, { tableClasses: page.tableClasses });

      let head;
      let body;
      if (home) {
        const taken = takeOpening(html, { withParagraphs: true });
        const actions = page.actions
          .map((a) => `<a class="btn ${a.kind}" href="${escapeHtml(resolveHref(a.href, HOME_PATH, pageOut, ctx))}">${escapeHtml(a.label[lang])}</a>`)
          .join("\n");
        head = `${taken.opening}\n<div class="actions">\n${actions}\n</div>`;
        body = taken.rest;
      } else {
        head = `<h1>${escapeHtml(page.title[lang])}</h1>`;
        body = html;
      }
      write(
        pageOut,
        layout({
          lang,
          title: home ? "Qohesion" : page.title[lang],
          head,
          body,
          out: pageOut,
          alt,
          current: page.id,
          wide: page.wide === true,
          home,
          source: { href: `${BLOB}/${sourcePath}` },
          build: info,
        }),
      );
    }
  }

  // The documentation: English only. A document that is a page of the website is not repeated here.
  const ctxEn = makeCtx("en");
  const rendered = [];
  for (const repoPath of docPages) {
    const markdown = fs.readFileSync(path.join(root, repoPath), "utf8");
    const pageOut = docOutPath(repoPath);
    const { title, html } = renderDocument(markdown, repoPath, pageOut, ctxEn);
    const taken = takeOpening(html, { withParagraphs: false });
    const heading = title ?? path.posix.basename(repoPath, ".md");
    write(
      pageOut,
      layout({
        lang: "en",
        title: heading,
        head: taken.opening || `<h1>${escapeHtml(heading)}</h1>`,
        body: taken.rest,
        out: pageOut,
        current: "docs",
        wide: WIDE_DOCS.has(repoPath),
        source: { href: `${BLOB}/${repoPath}` },
        build: info,
      }),
    );
    rendered.push({ repoPath, title: heading, status: statusLine(markdown), out: pageOut });
  }

  const placed = new Set();
  const groups = DOC_GROUPS.map((group) => {
    const members = group.docs ?? rendered.map((r) => r.repoPath).filter((p) => p.startsWith(group.prefix));
    members.forEach((p) => placed.add(p));
    return { title: group.title, items: members.map((p) => rendered.find((r) => r.repoPath === p)).filter(Boolean) };
  });
  const rest = rendered.filter((r) => !placed.has(r.repoPath));
  if (rest.length > 0) groups.push({ title: "Other", items: rest });

  const indexOut = "docs/index.html";
  const list = (items) =>
    `<ul class="docs">\n${items
      .map((r) => {
        const description = DOC_DESCRIPTIONS[r.repoPath];
        return `<li><a href="${pageUrl(indexOut, r.out)}">${escapeHtml(r.title)}</a>${description ? `\n<p>${escapeHtml(description)}</p>` : ""}${r.status ? `\n<p class="status">Status: ${escapeHtml(r.status)}</p>` : ""}</li>`;
      })
      .join("\n")}\n</ul>`;
  const published = PAGES.filter((p) => p.source).map((p) => `<li><a href="${pageUrl(indexOut, sitePageOut(p, "en"))}">${escapeHtml(p.title.en)}</a></li>`);
  const indexBody = `<p>Documents of the project, in English. They are built from the <a href="${REPO}/tree/main/docs">docs folder</a> of the repository and published here to be read and reviewed.</p>
<h2>Pages of the website</h2>
<ul class="docs">
${published.join("\n")}
</ul>
${groups.map((g) => `<h2>${escapeHtml(g.title)}</h2>\n${list(g.items)}`).join("\n")}`;
  write(
    indexOut,
    layout({
      lang: "en",
      title: "Documentation",
      head: "<h1>Documentation</h1>",
      body: indexBody,
      out: indexOut,
      current: "docs",
      source: { href: `${REPO}/tree/main/docs`, label: STRINGS.en.docsIndexSource },
      build: info,
    }),
  );

  fs.copyFileSync(path.join(here, "site.css"), path.join(out, "site.css"));
  fs.copyFileSync(path.join(root, "design/prototype/assets/mark.svg"), path.join(out, "assets/mark.svg"));
  fs.copyFileSync(path.join(root, "brand/gradient/qohesion-logo-gradient.svg"), path.join(out, "assets/logo.svg"));
  fs.copyFileSync(path.join(root, "design/prototype/fonts/figtree-latin.woff2"), path.join(out, "assets/figtree-latin.woff2"));
  fs.copyFileSync(path.join(root, "design/prototype/fonts/OFL-Figtree.txt"), path.join(out, "assets/OFL-Figtree.txt"));

  return written;
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
