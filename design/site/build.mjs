#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Builds the website: the pages in French (at the root) and English (under /en/), the documentation,
// and the ballot screen prototype that the home page runs in its frames.
//   node build.mjs <output directory> [--indexable] [--origin https://example.org]
// The output directory must be new, empty, or the result of an earlier build. A build is not indexable by
// search engines unless --indexable is given.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_PATH, renderHome, TEMPLATES } from "./home.mjs";
import { docOutPath, escapeHtml, pageUrl, renderDocument, splitLanguage, statusLine } from "./lib.mjs";
import { DOC_DESCRIPTIONS, DOC_GROUPS, LANGS, PAGES, SOCIAL, STRINGS, WIDE_DOCS } from "./site.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = "https://github.com/msolav/qohesion";
const BLOB = `${REPO}/blob/main`;
const MARKER = ".site-build";
const DEFAULT_ORIGIN = "https://dev.qohesion.app";

/** The same tiny choice the placeholder makes: an English browser is sent to /en/, anything else stays in French. */
const LANGUAGE_CHOICE = `(function(){try{var p=new URLSearchParams(location.search).get("lang");if(p==="fr")return;if(p==="en"){location.replace("en/");return}var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""];for(var i=0;i<l.length;i++){var c=String(l[i]).toLowerCase();if(c.indexOf("fr")===0)return;if(c.indexOf("en")===0){location.replace("en/");return}}}catch(e){}})();`;

/** Where a page of the website is written, relative to the site root. */
export function sitePageOut(page, lang) {
  const slug = page.slug[lang];
  const prefix = lang === "fr" ? "" : "en/";
  return slug === "" ? `${prefix}index.html` : `${prefix}${slug}/index.html`;
}

/** The address of a written page, from the site root. */
export function urlOf(out) {
  if (out === "index.html") return "/";
  return out.endsWith("/index.html") ? `/${out.slice(0, -"index.html".length)}` : `/${out}`;
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

function copyTree(from, to, skip = () => false) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip(entry.name)) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, target, skip);
    else fs.copyFileSync(source, target);
  }
}

const plain = (html) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

/** The frame around every page: head, masthead, main, footer. `main` is the markup inside <main>. */
function layout({ lang, title, description, main, out, alt = null, current = null, build, options, absolute = false, scripts = [] }) {
  const t = STRINGS[lang];
  const rel = path.posix.relative(path.posix.dirname(out), ".");
  const base = absolute ? "/" : rel === "" ? "" : `${rel}/`;
  const to = (target) => (absolute ? urlOf(target) : pageUrl(out, target));
  const find = (id) => PAGES.find((p) => p.id === id);
  const home = find("home");
  const origin = options.origin;

  const nav = [
    { label: t.pricing, href: to(sitePageOut(find("pricing"), lang)), here: current === "pricing" },
    { label: t.docsNav, href: to("docs/index.html"), here: current === "docs", secondary: true },
  ];
  const switcher = alt
    ? `<nav class="lang" aria-label="${escapeHtml(t.langLabel)}">${LANGS.map((l) => {
        const label = l === "fr" ? "Français" : "English";
        // Choosing French from an English page must not be undone by the language choice on the French home page.
        const query = l === "fr" && lang !== "fr" && alt.fr === "index.html" ? "?lang=fr" : "";
        return `<a href="${to(alt[l])}${query}" lang="${l}" aria-label="${label}"${l === lang ? ' aria-current="true"' : ""}>${l.toUpperCase()}</a>`;
      }).join("")}</nav>`
    : "";
  const footerLinks = [
    ...PAGES.filter((p) => p.footer).map((p) => ({ label: p.title[lang], href: to(sitePageOut(p, lang)) })),
    { label: t.docs, href: to("docs/index.html") },
    { label: t.sourceCode, href: REPO },
    ...SOCIAL.map((s) => ({ label: s.label, href: s.href })),
  ];
  const alternates = alt
    ? [...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${origin}${urlOf(alt[l])}">`), `<link rel="alternate" hreflang="x-default" href="${origin}${urlOf(alt.fr)}">`].join("\n")
    : "";
  const fullTitle = out === "index.html" || out === "en/index.html" ? "Qohesion" : `${title} · Qohesion`;

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
${options.indexable ? "" : '<meta name="robots" content="noindex, nofollow">\n'}<meta name="generator" content="${escapeHtml(`Qohesion website ${build.commit}, ${build.builtAt}`)}">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0F224C">
<link rel="canonical" href="${origin}${urlOf(out)}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Qohesion">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${origin}${urlOf(out)}">
<meta property="og:locale" content="${lang === "fr" ? "fr_CA" : "en_CA"}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${base}assets/mark.svg" type="image/svg+xml">
<link rel="icon" href="${base}favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${base}apple-touch-icon.png">
<link rel="stylesheet" href="${base}site.css">
${out === "index.html" ? `<script>${LANGUAGE_CHOICE}</script>\n` : ""}${scripts.map((src) => `<script src="${base}${src}" defer></script>\n`).join("")}</head>
<body>
<a class="skip" href="#main">${escapeHtml(t.skip)}</a>
<header class="top">
<a class="logo" href="${to(sitePageOut(home, lang))}" aria-label="${escapeHtml(t.homeLabel)}"><img src="${base}assets/logo.svg" alt="Qohesion" width="155" height="28"></a>
<nav class="nav" aria-label="${escapeHtml(t.navLabel)}">
${nav.map((n) => `<a href="${n.href}"${n.secondary ? ' class="wide-only"' : ""}${n.here ? ' aria-current="page"' : ""}>${escapeHtml(n.label)}</a>`).join("\n")}
</nav>
${switcher}
</header>
<main id="main">
${main}
</main>
<footer class="foot">
<div class="in">
<nav aria-label="${escapeHtml(t.footLabel)}">
${footerLinks.map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`).join("\n")}
</nav>
<p>${escapeHtml(t.licence)}</p>
</div>
</footer>
</body>
</html>
`;
}

/** A page other than the home page: a title, then its text on the night ground or on the paper sheet. */
function innerMain({ title, body, surface, wide }) {
  const w = wide ? " wide" : "";
  const text = surface === "night" ? sections(body) : `<div class="sheet prose">\n${body}\n</div>`;
  return `<div class="title${w}"><h1>${escapeHtml(title)}</h1></div>\n<div class="col${w}">\n${text}\n</div>`;
}

/** Cuts a rendered page at its level-2 headings into rows: the heading on the left, its content on the right. A row that holds a comparison table takes the full width. */
function sections(html) {
  const parts = html.split(/(?=<h2 )/);
  const intro = parts[0]?.startsWith("<h2 ") ? "" : (parts.shift() ?? "");
  const rows = parts.map((part) => {
    const split = /^(<h2 [^>]*>[\s\S]*?<\/h2>)\n?([\s\S]*)$/.exec(part);
    if (!split) return part;
    const full = part.includes('class="compare"');
    return `<section class="row${full ? " full" : ""}">\n${split[1]}\n<div class="row-body">\n${split[2]}\n</div>\n</section>`;
  });
  return `<div class="prose night">\n${intro}${rows.join("\n")}\n</div>`;
}

/** The title heading of a documentation page, which the frame sets apart from its text. */
function takeTitle(html) {
  const h1 = /^<h1 id="[^"]*">([\s\S]*?)<\/h1>\n?/.exec(html);
  return h1 ? { heading: plain(h1[1]), rest: html.slice(h1[0].length) } : { heading: null, rest: html };
}

/** Builds every page. Returns the list of files written. */
export function build({ repoRoot, outDir, commit, builtAt, origin = DEFAULT_ORIGIN, indexable = false }) {
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
  const options = { origin, indexable };
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
    siteLink: (name) => {
      // prototype, prototype-<template id>, prototype-embed, prototype-<template id>-embed
      const m = new RegExp(`^prototype(?:-(${TEMPLATES.map((t) => t.id).join("|")}))?(-embed)?$`).exec(name);
      if (!m) return null;
      return `prototype/?theme=${m[1] ?? "seed-packet"}&lang=${lang}${m[2] ? "&embed=1" : ""}`;
    },
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
      let main;
      if (page.id === "home") {
        main = renderHome({ lang, out: pageOut, ctx });
      } else {
        const markdown = splitLanguage(fs.readFileSync(path.join(root, page.source), "utf8"), lang);
        const { html } = renderDocument(markdown, page.source, pageOut, ctx, { tableClasses: page.tableClasses, scrollHint: STRINGS[lang].scrollHint });
        main = innerMain({ title: page.title[lang], body: html, surface: page.surface, wide: page.wide === true });
      }
      write(
        pageOut,
        layout({ lang, title: page.title[lang], description: page.description[lang], main, out: pageOut, alt, current: page.id, build: info, options, scripts: page.id === "home" ? ["assets/carousel.js"] : [] }),
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
    const taken = takeTitle(html);
    const heading = taken.heading ?? title ?? path.posix.basename(repoPath, ".md");
    const firstParagraph = /<p>([\s\S]*?)<\/p>/.exec(taken.rest);
    const description = (firstParagraph ? plain(firstParagraph[1]) : `Qohesion documentation: ${heading}.`).slice(0, 200);
    write(
      pageOut,
      layout({
        lang: "en",
        title: heading,
        description,
        main: innerMain({ title: heading, body: taken.rest, surface: "paper", wide: WIDE_DOCS.has(repoPath) }),
        out: pageOut,
        current: "docs",
        build: info,
        options,
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
  const indexBody = `<p>Documents of the project, in English. They are built from the <a href="${REPO}/tree/main/docs">docs folder</a> of the repository.</p>
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
      description: "Documents of the Qohesion project: decisions, glossary, threat model, installation and templates.",
      main: innerMain({ title: "Documentation", body: indexBody, surface: "paper" }),
      out: indexOut,
      current: "docs",
      build: info,
      options,
    }),
  );

  // A page for an address that leads nowhere. It is served from any depth, so its links start at the root.
  const fr = STRINGS.fr;
  const en = STRINGS.en;
  write(
    "404.html",
    layout({
      lang: "fr",
      title: fr.notFound,
      description: fr.notFoundText,
      main: `<div class="title"><h1>${escapeHtml(fr.notFound)}</h1><p>${escapeHtml(fr.notFoundText)}</p></div>
<div class="col"><p><a class="btn primary" href="/">${escapeHtml(fr.notFoundBack)}</a></p>
<div lang="en"><h2>${escapeHtml(en.notFound)}</h2><p>${escapeHtml(en.notFoundText)}</p><p><a href="/en/">${escapeHtml(en.notFoundBack)}</a></p></div></div>`,
      out: "404.html",
      build: info,
      options,
      absolute: true,
    }),
  );

  fs.writeFileSync(path.join(out, "robots.txt"), indexable ? "User-agent: *\nAllow: /\n" : "User-agent: *\nDisallow: /\n");

  // Files the pages load, and the ballot screen prototype that the home page runs in its frames.
  fs.copyFileSync(path.join(here, "site.css"), path.join(out, "site.css"));
  fs.copyFileSync(path.join(here, "carousel.js"), path.join(out, "assets/carousel.js"));
  fs.copyFileSync(path.join(root, "design/prototype/assets/mark.svg"), path.join(out, "assets/mark.svg"));
  fs.copyFileSync(path.join(root, "brand/gradient/qohesion-logo-gradient-dark.svg"), path.join(out, "assets/logo.svg"));
  fs.copyFileSync(path.join(root, "brand/gradient/favicon-32.png"), path.join(out, "favicon-32.png"));
  fs.copyFileSync(path.join(root, "brand/gradient/apple-touch-icon.png"), path.join(out, "apple-touch-icon.png"));
  for (const font of ["figtree-latin.woff2", "OFL-Figtree.txt"]) fs.copyFileSync(path.join(root, "design/prototype/fonts", font), path.join(out, "assets", font));
  for (const font of ["outfit-latin.woff2", "OFL-Outfit.txt"]) fs.copyFileSync(path.join(here, "fonts", font), path.join(out, "assets", font));
  copyTree(path.join(root, "design/prototype"), path.join(out, "prototype"), (name) => name === ".DS_Store");

  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outDir = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--origin");
  if (!outDir) {
    console.error("Usage: node build.mjs <output directory> [--indexable] [--origin https://example.org]");
    process.exit(2);
  }
  const originAt = args.indexOf("--origin");
  const repoRoot = path.resolve(here, "../..");
  const pages = build({
    repoRoot,
    outDir,
    commit: repoState(repoRoot),
    builtAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    origin: originAt === -1 ? DEFAULT_ORIGIN : args[originAt + 1],
    indexable: args.includes("--indexable"),
  });
  console.log(`Built ${pages.length} pages into ${path.resolve(outDir)}`);
}
