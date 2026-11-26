// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Pure helpers for the documents site: links, headings, language sections and status lines.
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
export function outPath(repoPath) {
  if (!repoPath.startsWith("docs/") || !repoPath.endsWith(".md")) {
    throw new Error(`Not a document in docs/: ${repoPath}`);
  }
  return repoPath.slice("docs/".length, -".md".length) + ".html";
}

/** The address of one page, written from another page. */
export function relativeUrl(fromOut, toOut) {
  return path.posix.relative(path.posix.dirname(fromOut), toOut) || path.posix.basename(toOut);
}

/**
 * Turns a link written in a document into the address used on the site.
 *  - https and mailto links stay as they are;
 *  - a link to another document in the set becomes a link to its page;
 *  - a link to any other file of the repository becomes a link to that file on GitHub;
 *  - anything else throws, so a broken link stops the build.
 * `ctx` is { pages: Set of repository paths, exists(repoPath), isDirectory(repoPath), blob: base address }.
 */
export function resolveHref(href, fromPath, ctx) {
  if (/^(https:\/\/|mailto:)/i.test(href)) return href;
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

  if (ctx.pages.has(target)) return relativeUrl(outPath(fromPath), outPath(target)) + hash;
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

/**
 * Wraps each language section of a document (a level-2 heading "English" or "Français" and what follows it)
 * in an element that carries the language, so that screen readers pronounce it correctly.
 */
export function wrapLanguages(html) {
  const parts = html.split(/(?=<!--lang:(?:en|fr)-->)/);
  return parts
    .map((part) => {
      const marker = /^<!--lang:(en|fr)-->/.exec(part);
      if (!marker) return part;
      const lang = marker[1];
      return `<section lang="${lang}">${part.slice(marker[0].length)}</section>`;
    })
    .join("");
}

/** Which language sections a rendered document has, in order, as { lang, id, label }. */
export function languageSections(html) {
  return [...html.matchAll(/<!--lang:(en|fr)--><h2 id="([^"]+)">([^<]*)<\/h2>/g)].map((m) => ({
    lang: m[1],
    id: m[2],
    label: m[3],
  }));
}

/**
 * Renders one document to the HTML of its body. Raw HTML in a document is shown as text, never run.
 * Returns the title (the first level-1 heading) and the HTML.
 */
export function renderDocument(markdown, fromPath, ctx) {
  let title = null;
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
        const marker = depth === 2 && (id === "english" || id === "francais") ? `<!--lang:${id === "english" ? "en" : "fr"}-->` : "";
        return `${marker}<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, tokens }) {
        const inner = this.parser.parseInline(tokens);
        return `<a href="${escapeHtml(resolveHref(href, fromPath, ctx))}">${inner}</a>`;
      },
      image({ text }) {
        throw new Error(`${fromPath}: images are not supported ("${text}")`);
      },
      html({ text }) {
        return escapeHtml(text);
      },
      table(token) {
        const html = Renderer.prototype.table.call(this, token);
        return `<div class="table-wrap" tabindex="0" role="region" aria-label="Table">${html}</div>\n`;
      },
    },
  });

  let html = marked.parse(markdown, { async: false });
  // A rule before a language heading doubles the heading's own rule.
  html = html.replace(/<hr>\s*(?=<!--lang:)/g, "");
  // The first cell of each body row names the row.
  html = html.replace(/<tr>\s*<td([^>]*)>([\s\S]*?)<\/td>/g, '<tr><th scope="row"$1>$2</th>');
  // An empty corner cell still needs a name for screen readers.
  html = html.replace("<th></th>", '<th><span class="sr-only">Item</span></th>');
  return { title: title ?? path.posix.basename(fromPath, ".md"), html };
}
