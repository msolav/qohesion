/**
 * Address checks used when an administrator enters the list and when a member enters their own address.
 * Only plain addresses are accepted (no quoted local parts, no comments, no IP literals).
 */

export interface ParsedAddress {
  readonly local: string;
  readonly domain: string;
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/** Splits an address and checks its shape. The domain is lower-cased. Returns null when it is not acceptable. */
export function parseAddress(input: string): ParsedAddress | null {
  const value = input.trim();
  if (value.length === 0 || value.length > 254) return null;
  const at = value.lastIndexOf("@");
  if (at <= 0 || at !== value.indexOf("@")) return null; // exactly one "@", not first
  const local = value.slice(0, at);
  const rawDomain = value.slice(at + 1);
  // ASCII only, checked before lower-casing: some non-ASCII letters (the Kelvin sign) lower-case to ASCII ones.
  // Internationalized domains are written in their xn-- form.
  if (!/^[\x21-\x7e]+$/.test(rawDomain)) return null;
  const domain = rawDomain.toLowerCase();
  if (local.length > 64 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return null;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  const labels = domain.split(".");
  if (labels.length < 2 || domain.length > 253) return null;
  if (!labels.every((l) => LABEL.test(l))) return null;
  const tld = labels[labels.length - 1] ?? "";
  if (!/^([a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(tld)) return null;
  return { local, domain };
}

export function isValidAddress(input: string): boolean {
  return parseAddress(input) !== null;
}

const DOT_INSENSITIVE = new Set(["gmail.com", "googlemail.com"]);
const PLUS_TAGS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "outlook.fr", "outlook.ca", "hotmail.com", "hotmail.fr", "hotmail.ca",
  "live.com", "live.ca", "live.fr", "msn.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me", "fastmail.com",
]);
const DOMAIN_ALIASES: Readonly<Record<string, string>> = { "googlemail.com": "gmail.com", "protonmail.com": "proton.me", "pm.me": "proton.me" };

/**
 * Canonical form for comparing addresses and for fingerprints: lower case, known provider aliases merged,
 * "+tag" removed for providers that ignore it, dots removed for Gmail. Other providers are left unchanged,
 * because their local parts may be significant. Returns null for an invalid address.
 */
export function normalizeAddress(input: string): string | null {
  const parsed = parseAddress(input);
  if (!parsed) return null;
  let local = parsed.local.toLowerCase();
  const domain = DOMAIN_ALIASES[parsed.domain] ?? parsed.domain;
  if (PLUS_TAGS.has(parsed.domain)) local = local.split("+")[0] ?? local;
  if (DOT_INSENSITIVE.has(parsed.domain)) local = local.replace(/\./g, "");
  return local.length === 0 ? null : `${local}@${domain}`;
}

/** Domains of common providers, used only to suggest a correction for a typo. */
export const COMMON_DOMAINS: readonly string[] = [
  "gmail.com", "outlook.com", "outlook.fr", "outlook.ca", "hotmail.com", "hotmail.fr", "hotmail.ca", "live.com", "live.ca", "live.fr",
  "yahoo.com", "yahoo.ca", "yahoo.fr", "icloud.com", "me.com", "proton.me", "protonmail.com", "videotron.ca", "bell.net", "sympatico.ca",
  "cgocable.ca", "telus.net", "shaw.ca", "rogers.com", "aol.com", "msn.com", "gmx.com", "free.fr", "orange.fr", "laposte.net",
];

/** Edit distance where swapping two adjacent letters counts as one edit (optimal string alignment). */
function distance(a: string, b: string): number {
  const w = b.length + 1;
  const d = new Array<number>((a.length + 1) * w).fill(0);
  const at = (i: number, j: number): number => d[i * w + j] ?? 0;
  for (let i = 0; i <= a.length; i++) d[i * w] = i;
  for (let j = 0; j <= b.length; j++) d[j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, at(i - 2, j - 2) + 1);
      d[i * w + j] = best;
    }
  }
  return at(a.length, b.length);
}

/**
 * Suggests the likely intended domain for a mistyped one ("gmial.com" gives "gmail.com").
 * Returns null when the domain is a known one, or when no single known domain is close enough.
 */
export function suggestDomain(domain: string, known: readonly string[] = COMMON_DOMAINS): string | null {
  const d = domain.trim().toLowerCase();
  if (d.length < 4 || known.includes(d)) return null;
  const limit = d.length <= 9 ? 1 : 2;
  let best: string | null = null;
  let bestDistance = Infinity;
  let tie = false;
  for (const candidate of known) {
    const n = distance(d, candidate);
    if (n === 0 || n > limit) continue;
    if (n < bestDistance) { best = candidate; bestDistance = n; tie = false; }
    else if (n === bestDistance) tie = true;
  }
  return tie ? null : best;
}

/** A short built-in list. The application replaces it with a maintained list. */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "yopmail.com", "trashmail.com", "getnada.com", "throwawaymail.com", "maildrop.cc", "dispostable.com", "fakeinbox.com",
]);

export function isDisposableDomain(domain: string, extra: ReadonlySet<string> = new Set()): boolean {
  const d = domain.trim().toLowerCase();
  return DISPOSABLE_DOMAINS.has(d) || extra.has(d);
}

export type AddressIssue = { readonly code: "invalid" } | { readonly code: "disposable"; readonly domain: string };
export interface AddressCheck {
  readonly ok: boolean;
  readonly normalized?: string;
  readonly issue?: AddressIssue;
  /** A correction to offer ("Did you mean ...?"). The address is still valid. */
  readonly suggestion?: string;
}

/** Full check of one entered address, as the entry forms use it. */
export function checkAddress(input: string, extraDisposable: ReadonlySet<string> = new Set()): AddressCheck {
  const parsed = parseAddress(input);
  const normalized = normalizeAddress(input);
  if (!parsed || !normalized) return { ok: false, issue: { code: "invalid" } };
  if (isDisposableDomain(parsed.domain, extraDisposable)) return { ok: false, normalized, issue: { code: "disposable", domain: parsed.domain } };
  const fix = suggestDomain(parsed.domain);
  return fix ? { ok: true, normalized, suggestion: `${parsed.local}@${fix}` } : { ok: true, normalized };
}
