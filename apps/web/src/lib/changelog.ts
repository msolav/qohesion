/**
 * Reads CHANGELOG.md (Keep a Changelog format) into data that the page renders without any HTML injection:
 * text, code and link segments only.
 */

export type Segment =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "code"; readonly text: string }
  | { readonly type: "link"; readonly text: string; readonly href: string };

export interface Section {
  readonly title: string;
  readonly items: readonly Segment[][];
}

export interface Release {
  /** "Unreleased" or a version such as "0.1.0". */
  readonly name: string;
  readonly date?: string;
  /** A tag after the date, such as "YANKED", which Keep a Changelog allows. */
  readonly tag?: string;
  readonly intro: readonly Segment[][];
  readonly sections: readonly Section[];
}

// No backslash: browsers read "/\\evil.example" as "//evil.example", an address on another site.
const SAFE_HREF = /^(https:\/\/[^\s<>"'\\]+|\/[^\s<>"'/\\][^\s<>"'\\]*|#[^\s<>"'\\]+)$/;

/** Splits a line into text, `code` and [link](address) segments. Links to anything but https or this site stay as text. */
export function inline(source: string): Segment[] {
  const out: Segment[] = [];
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const m of source.matchAll(pattern)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: "text", text: source.slice(last, at) });
    if (m[1] !== undefined) out.push({ type: "code", text: m[1] });
    else if (m[2] !== undefined && m[3] !== undefined) {
      out.push(SAFE_HREF.test(m[3]) ? { type: "link", text: m[2], href: m[3] } : { type: "text", text: m[2] });
    }
    last = at + m[0].length;
  }
  if (last < source.length) out.push({ type: "text", text: source.slice(last) });
  return out;
}

export function parseChangelog(text: string): Release[] {
  const releases: { name: string; date?: string; tag?: string; intro: Segment[][]; sections: { title: string; items: Segment[][] }[] }[] = [];
  let release: (typeof releases)[number] | undefined;
  let section: { title: string; items: Segment[][] } | undefined;
  let continuing = false;

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const heading = /^## \[([^\]]+)\](?:\s+-\s+(\S+))?(?:\s+\[([^\]]+)\])?\s*$/.exec(line);
    if (heading) {
      release = {
        name: heading[1] ?? "",
        ...(heading[2] ? { date: heading[2] } : {}),
        ...(heading[3] ? { tag: heading[3] } : {}),
        intro: [],
        sections: [],
      };
      releases.push(release);
      section = undefined;
      continuing = false;
      continue;
    }
    if (!release) continue;
    if (/^\[[^\]]+\]:\s*\S+/.test(line)) continue; // link reference definitions at the foot of the file
    const sub = /^### (.+)$/.exec(line);
    if (sub) {
      section = { title: sub[1] ?? "", items: [] };
      release.sections.push(section);
      continuing = false;
      continue;
    }
    if (line.trim() === "") { continuing = false; continue; }
    const item = /^[-*] (.+)$/.exec(line);
    if (item && section) {
      section.items.push(inline(item[1] ?? ""));
      continuing = true;
      continue;
    }
    if (/^\s+\S/.test(line) && continuing && section) {
      const last = section.items[section.items.length - 1];
      if (last) last.push({ type: "text", text: ` ${line.trim()}` });
      continue;
    }
    if (section) section.items.push(inline(line.trim())); // a plain line inside a section counts as one entry ("None.")
    else release.intro.push(inline(line.trim()));
  }
  return releases;
}
