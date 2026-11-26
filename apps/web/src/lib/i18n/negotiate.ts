export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Language tags of an Accept-Language header, best first. Ignores tags with q=0 and malformed parts. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  const items: { tag: string; q: number; order: number }[] = [];
  header.split(",").forEach((part, order) => {
    const [rawTag, ...params] = part.trim().split(";");
    const tag = (rawTag ?? "").trim().toLowerCase();
    if (!/^[a-z]{1,8}(-[a-z0-9]{1,8})*$|^\*$/.test(tag)) return;
    let q = 1;
    for (const param of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(param);
      if (m) q = Number(m[1]);
    }
    if (Number.isFinite(q) && q > 0 && q <= 1) items.push({ tag, q, order });
  });
  return items.sort((a, b) => b.q - a.q || a.order - b.order).map((i) => i.tag);
}

export interface NegotiationInput {
  /** Explicit choice in the address (?lang=en). */
  readonly query?: string | null | undefined;
  /** Choice remembered from an earlier visit. */
  readonly cookie?: string | null | undefined;
  /** Browser setting. */
  readonly acceptLanguage?: string | null | undefined;
}

/**
 * Chooses the display language: an explicit choice, then the remembered choice, then the browser setting.
 * French is used when the browser language is neither French nor English (docs/content-style.md).
 */
export function negotiateLocale(input: NegotiationInput): Locale {
  if (isLocale(input.query)) return input.query;
  if (isLocale(input.cookie)) return input.cookie;
  for (const tag of parseAcceptLanguage(input.acceptLanguage)) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
