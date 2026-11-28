// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * How the list of signatories of a named poll shows each person: the name and the address are set apart, and each one
 * is shown in full, partly hidden, or not at all. Any pair is allowed. Administrators always read the full entry.
 */

export const NAME_MODES = ["full", "masked", "none"] as const;
export const EMAIL_MODES = ["full", "masked", "none"] as const;
export const REFERENCE_MODES = ["full", "masked", "none"] as const;
export type NameMode = (typeof NAME_MODES)[number];
export type EmailMode = (typeof EMAIL_MODES)[number];
export type ReferenceMode = (typeof REFERENCE_MODES)[number];

export interface Disclosure {
  readonly name: NameMode;
  readonly email: EmailMode;
  /** A reference given by or about the participant: a door number, a member number. Shown only when the poll says so. */
  readonly reference?: ReferenceMode;
}

/** What a new named poll starts with: the name as given, the address partly hidden, no reference. */
export const DEFAULT_DISCLOSURE: Disclosure = { name: "full", email: "masked", reference: "none" };

/** Whether voters are asked for a piece of information when they vote: not asked, asked and optional, or required. */
export const ASK_MODES = ["no", "optional", "required"] as const;
export type Ask = (typeof ASK_MODES)[number];
export interface Collect {
  readonly name: Ask;
  readonly reference: Ask;
}
export const DEFAULT_COLLECT: Collect = { name: "no", reference: "no" };
export const isAsk = (value: unknown): value is Ask => typeof value === "string" && (ASK_MODES as readonly string[]).includes(value);
export function readCollect(value: unknown): Collect {
  if (typeof value === "string") {
    try {
      return readCollect(JSON.parse(value));
    } catch {
      return DEFAULT_COLLECT;
    }
  }
  const v = value as { name?: unknown; reference?: unknown } | null;
  return { name: isAsk(v?.name) ? v.name : "no", reference: isAsk(v?.reference) ? v.reference : "no" };
}
export const asksAnything = (c: Collect): boolean => c.name !== "no" || c.reference !== "no";

export const isNameMode = (value: unknown): value is NameMode => typeof value === "string" && (NAME_MODES as readonly string[]).includes(value);
export const isEmailMode = (value: unknown): value is EmailMode => typeof value === "string" && (EMAIL_MODES as readonly string[]).includes(value);
export const isReferenceMode = (value: unknown): value is ReferenceMode => typeof value === "string" && (REFERENCE_MODES as readonly string[]).includes(value);

/** A stored or submitted value as a disclosure, or the default when it is not one. */
export function readDisclosure(value: unknown): Disclosure {
  if (typeof value === "string") {
    try {
      return readDisclosure(JSON.parse(value));
    } catch {
      return DEFAULT_DISCLOSURE;
    }
  }
  const v = value as { name?: unknown; email?: unknown; reference?: unknown } | null;
  return { name: isNameMode(v?.name) ? v.name : DEFAULT_DISCLOSURE.name, email: isEmailMode(v?.email) ? v.email : DEFAULT_DISCLOSURE.email, reference: isReferenceMode(v?.reference) ? v.reference : "none" };
}

/** Whether a list that shows nothing about anyone is meant: neither the name, the address nor the reference. */
export const showsNobody = (d: Disclosure): boolean => d.name === "none" && d.email === "none" && (d.reference ?? "none") === "none";

/** The disclosure as the approved digest sees it: the reference only when it is shown, so that earlier polls keep their digest. */
export const digestOfDisclosure = (d: Disclosure): Record<string, string> => ({ name: d.name, email: d.email, ...(d.reference === undefined || d.reference === "none" ? {} : { reference: d.reference }) });

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
export function signatoryLabel(entry: { readonly name: string | null; readonly address: string; readonly reference?: string | null }, d: Disclosure): string {
  const name = entry.name === null || entry.name.trim() === "" ? "" : d.name === "full" ? entry.name.trim() : d.name === "masked" ? maskName(entry.name) : "";
  const email = d.email === "full" ? entry.address : d.email === "masked" ? maskEmail(entry.address) : "";
  const reference = entry.reference == null || entry.reference.trim() === "" ? "" : d.reference === "full" ? entry.reference.trim() : d.reference === "masked" ? hide(entry.reference.trim()) : "";
  const who = name && email ? `${name} <${email}>` : name || email;
  if (who && reference) return `${who} · ${reference}`;
  return who || reference || "—";
}
