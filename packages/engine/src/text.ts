import type { Locale, LocalizedText } from "./types.js";

/**
 * Picks the text for a language: exact tag, then the base language ("fr-CA" gives "fr"),
 * then the fallbacks in order, then any available text. Returns "" when the text is empty.
 */
export function resolveText(
  text: LocalizedText | undefined,
  locale: Locale,
  fallbacks: readonly Locale[] = ["fr", "en"],
): string {
  if (!text) return "";
  const base = locale.split("-")[0] ?? locale;
  const candidates = [locale, base, ...fallbacks];
  for (const tag of candidates) {
    const value = text[tag];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  for (const value of Object.values(text)) {
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

export function hasText(text: LocalizedText | undefined, locale: Locale): boolean {
  const value = text?.[locale];
  return typeof value === "string" && value.trim() !== "";
}
