// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * How the list of signatories of a named poll shows each person: the name and the address are set apart, and each one
 * is shown in full, partly hidden, or not at all. Any pair is allowed. Administrators always read the full entry.
 */

export const NAME_MODES = ["full", "masked", "none"] as const;
export const EMAIL_MODES = ["full", "masked", "none"] as const;
export type NameMode = (typeof NAME_MODES)[number];
export type EmailMode = (typeof EMAIL_MODES)[number];

export interface Disclosure {
  readonly name: NameMode;
  readonly email: EmailMode;
}

/** What a new named poll starts with: the name as given, the address partly hidden. */
export const DEFAULT_DISCLOSURE: Disclosure = { name: "full", email: "masked" };

export const isNameMode = (value: unknown): value is NameMode => typeof value === "string" && (NAME_MODES as readonly string[]).includes(value);
export const isEmailMode = (value: unknown): value is EmailMode => typeof value === "string" && (EMAIL_MODES as readonly string[]).includes(value);

/** A stored or submitted value as a disclosure, or the default when it is not one. */
export function readDisclosure(value: unknown): Disclosure {
  if (typeof value === "string") {
    try {
      return readDisclosure(JSON.parse(value));
    } catch {
      return DEFAULT_DISCLOSURE;
    }
  }
  const v = value as { name?: unknown; email?: unknown } | null;
  return { name: isNameMode(v?.name) ? v.name : DEFAULT_DISCLOSURE.name, email: isEmailMode(v?.email) ? v.email : DEFAULT_DISCLOSURE.email };
}

/** Whether a list that shows nothing about anyone is meant: neither the name nor the address. */
export const showsNobody = (d: Disclosure): boolean => d.name === "none" && d.email === "none";

const STARS = "***";

/**
 * "Marie Tremblay" as "Marie T***": the first name in full, and the first letter of the rest. A name of one word has no
 * first name to keep, so it shows its first letter only. The number of stars never follows the length of the name.
 */
export function maskName(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  const first = words[0];
  if (first === undefined) return "";
  if (words.length === 1) return `${[...first][0] ?? ""}${STARS}`;
  const rest = words.slice(1).join(" ");
  return `${first} ${[...rest][0] ?? ""}${STARS}`;
}

/** The first and the last letter of a part, with stars between. A part of two letters or fewer shows its first letter only. */
function hide(part: string): string {
  const chars = [...part];
  if (chars.length === 0) return "";
  if (chars.length <= 2) return `${chars[0]}${STARS}`;
  return `${chars[0]}${STARS}${chars[chars.length - 1]}`;
}

/**
 * "marie.tremblay@example.org" as "m***y@e***e.org": the first and the last letter of the name before the at sign and of
 * the host, stars between, the ending of the domain kept. Enough to tell that two entries differ and to recognise one's
 * own, not to read an address.
 */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf("@");
  if (at < 1) return STARS;
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const ending = dot > 0 ? domain.slice(dot) : "";
  return `${hide(local)}@${hide(host)}${ending}`;
}

/**
 * How one entry of the roll reads in a list of signatories. The name comes first, then the address between angle
 * brackets. An entry without a name shows its address alone when addresses are shown. When nothing can be shown for an
 * entry, a dash stands in.
 */
export function signatoryLabel(entry: { readonly name: string | null; readonly address: string }, d: Disclosure): string {
  const name = entry.name === null || entry.name.trim() === "" ? "" : d.name === "full" ? entry.name.trim() : d.name === "masked" ? maskName(entry.name) : "";
  const email = d.email === "full" ? entry.address : d.email === "masked" ? maskEmail(entry.address) : "";
  if (name && email) return `${name} <${email}>`;
  return name || email || "—";
}
