// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Pure helpers for the website build: links, headings, language sections and status lines.
// Nothing here reads the file system, so everything can be tested on its own.

import path from "node:path";
import { Marked, Renderer } from "marked";

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** "Français" becomes "francais": lower case, accents removed, anything else a hyphen. */
export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** The page that a document in docs/ is published as, relative to the site root. */
export function docOutPath(repoPath) {
  if (!repoPath.startsWith("docs/") || !repoPath.endsWith(".md")) {
    throw new Error(`Not a document in docs/: ${repoPath}`);
  }
  return `${repoPath.slice(0, -".md".length)}.html`;
}

/**
 * The address of one page, written from another page. A page named index.html is addressed by its folder,
 * so that the site shows /fr/tarifs/ and not /fr/tarifs/index.html.
 */
export function pageUrl(fromOut, toOut) {
  const relative = path.posix.relative(path.posix.dirname(fromOut), toOut);
  if (relative === "index.html") return "./";
  if (relative.endsWith("/index.html")) return relative.slice(0, -"index.html".length);
  return relative;
}

/**
 * Turns a link written in a document into the address used on the site.
 *  - https and mailto links stay as they are;
 *  - "site:name" goes to a part of the site that is not built from a document (the ballot screen preview);
 *  - a link to a document that has a page becomes a link to that page, in the language of the page that links;
 *  - a link to any other file of the repository becomes a link to that file on GitHub;
 *  - anything else throws, so a broken link stops the build.
 * `ctx` is { outFor(repoPath): page or null, siteLink(name): address or null, exists(repoPath),
 * isDirectory(repoPath), blob: base address }. `fromOut` is the page that carries the link.
 */
export function resolveHref(href, fromPath, fromOut, ctx) {
  if (/^(https:\/\/|mailto:)/i.test(href)) return href;

  const site = /^site:([a-z-]+)$/.exec(href);
  if (site) {
    const target = ctx.siteLink(site[1] ?? "");
    if (target === null) throw new Error(`${fromPath}: unknown site link "${href}"`);
    const [pathPart = "", query = ""] = target.split("?");
    const folder = pathPart.endsWith("/");
    const relative = path.posix.relative(path.posix.dirname(fromOut), pathPart.replace(/\/$/, ""));
    return `${relative}${folder ? "/" : ""}${query ? `?${query}` : ""}`;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
    throw new Error(`${fromPath}: unsupported link "${href}" (only https and mailto are allowed)`);
  }
  if (href.startsWith("#")) return href;

  const hashAt = href.indexOf("#");
  const pathPart = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  if (pathPart === "") return hash || "#";

  let target = path.posix.normalize(path.posix.join(path.posix.dirname(fromPath), decodeURI(pathPart)));
  if (target.startsWith("../") || target === "..") {
    throw new Error(`${fromPath}: link "${href}" leaves the repository`);
  }
  if (ctx.isDirectory(target)) target = `${target.replace(/\/$/, "")}/README.md`;

  const out = ctx.outFor(target);
  if (out !== null) return pageUrl(fromOut, out) + hash;
  if (ctx.exists(target)) return `${ctx.blob}/${target}${hash}`;
  throw new Error(`${fromPath}: link "${href}" points to "${target}", which does not exist`);
}

/** The first sentence of a "Status:" line, without links, or null when the document has none. */
export function statusLine(markdown) {
  const match = /^(?:-\s*)?Status:\s*(.+)$/m.exec(markdown);
  if (!match || match[1] === undefined) return null;
  const plain = match[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").trim();
  const cut = plain.search(/\.(\s|$)/);
  const sentence = (cut === -1 ? plain : plain.slice(0, cut)).trim();
  return sentence === "" ? null : sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

const LANGUAGE_HEADING = /^## (English|Français)\s*$/;

/** True when a document holds a section per language, each under a level-2 heading "English" or "Français". */
export function hasLanguageSections(markdown) {
  return markdown.split("\n").some((line) => LANGUAGE_HEADING.test(line));
}

/**
 * Keeps the section of one language. The language heading goes, and every heading below it moves up one level,
 * so that the sections of a bilingual document become the sections of the page. A document with no language
 * sections is returned as it is.
 */
export function splitLanguage(markdown, lang) {
  const lines = markdown.split("\n");
  const marks = [];
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line)) fenced = !fenced;
    const m = fenced ? null : LANGUAGE_HEADING.exec(line);
    if (m) marks.push({ at: i, lang: m[1] === "English" ? "en" : "fr" });
  });
  if (marks.length === 0) return markdown;

  const index = marks.findIndex((m) => m.lang === lang);
  if (index === -1) throw new Error(`The document has no "${lang}" section`);
  const start = (marks[index]?.at ?? 0) + 1;
  const end = marks[index + 1]?.at ?? lines.length;

  const body = lines.slice(start, end);
  while (body.length > 0 && /^(\s*|---+)$/.test(body[body.length - 1] ?? "")) body.pop();

  fenced = false;
  const shifted = body.map((line) => {
    if (/^(```|~~~)/.test(line)) fenced = !fenced;
    return !fenced && /^#{3,6}\s/.test(line) ? line.slice(1) : line;
  });
  return `${shifted.join("\n").trim()}\n`;
}

/**
 * Renders one document to the HTML of its body. Raw HTML in a document is shown as text, never run.
 * `options.tableClasses` gives a class to each table, in the order the tables appear.
 * Returns the title (the first level-1 heading, if any) and the HTML.
 */
export function renderDocument(markdown, fromPath, fromOut, ctx, options = {}) {
  let title = null;
  let tableIndex = 0;
  const seen = new Map();
  const marked = new Marked({ gfm: true, breaks: false });

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const plain = inner.replace(/<[^>]+>/g, "");
        if (depth === 1 && title === null) title = plain;
        const base = slugify(plain) || "section";
        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        const id = count === 1 ? base : `${base}-${count}`;
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, tokens }) {
        const inner = this.parser.parseInline(tokens);
        return `<a href="${escapeHtml(resolveHref(href, fromPath, fromOut, ctx))}">${inner}</a>`;
      },
      image({ text }) {
        throw new Error(`${fromPath}: images are not supported ("${text}")`);
      },
      html({ text }) {
        return escapeHtml(text);
      },
      table(token) {
        const className = options.tableClasses?.[tableIndex++];
        const html = Renderer.prototype.table.call(this, token);
        const classed = className ? html.replace("<table>", `<table class="${escapeHtml(className)}">`) : html;
        return `<div class="table-wrap" tabindex="0" role="region" aria-label="Table">${classed}</div>\n`;
      },
    },
  });

  let html = marked.parse(markdown, { async: false });
  // The first cell of each body row names the row.
  html = html.replace(/<tr>\s*<td([^>]*)>([\s\S]*?)<\/td>/g, '<tr><th scope="row"$1>$2</th>');
  // An empty corner cell still needs a name for screen readers.
  html = html.replace("<th></th>", '<th><span class="sr-only">Item</span></th>');
  return { title, html };
}
