// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The text an administrator types or pastes into the roll. Entries are separated by line breaks, commas or semicolons.
 * An entry is an address, or a name followed by an address in angle brackets: Marie Tremblay <marie@example.org>. A name
 * may be quoted, which lets it hold a comma: "Tremblay, Marie" <marie@example.org>.
 */

export interface RollLine {
  /** The text as typed, for the report of what was left out. */
  readonly line: string;
  readonly name: string | null;
  readonly address: string;
}

export const MAX_NAME = 80;

const ENTRY = /(?:"[^"]*"|[^<>\n\r,;"]*)\s*<[^<>\n\r,;]*>|[^\n\r,;]+/g;
const NAMED = /^(?<name>"[^"]*"|[^<>"]*?)\s*<(?<address>[^<>]*)>$/;

/** A name as it is kept: quotes and control characters removed, spaces collapsed, cut at a fixed length. */
export function cleanName(raw: string): string | null {
  const text = raw.replace(/^"|"$/g, "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (text === "") return null;
  return [...text].slice(0, MAX_NAME).join("");
}

export function parseRollText(text: string): RollLine[] {
  const lines: RollLine[] = [];
  for (const match of text.matchAll(ENTRY)) {
    const line = match[0].trim();
    if (line === "") continue;
    const named = NAMED.exec(line);
    if (named?.groups) lines.push({ line, name: cleanName(named.groups["name"] ?? ""), address: (named.groups["address"] ?? "").trim() });
    else lines.push({ line, name: null, address: line });
  }
  return lines;
}

/** The addresses of a text, in lower case, each once, in order. What a request to add people names: a name is only a label. */
export function rollAddresses(text: string): string[] {
  return [...new Set(parseRollText(text).map((l) => l.address.toLowerCase()))].sort();
}
