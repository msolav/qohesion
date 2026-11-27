export const THEMES = ["standard", "seed-packet", "ballot-paper", "boarding-pass", "guide-map"] as const;
export type Theme = (typeof THEMES)[number];

/** Display names of the templates, in each language. */
export const THEME_NAMES: Record<Theme, { readonly fr: string; readonly en: string }> = {
  "seed-packet": { fr: "Seed Packet", en: "Seed Packet" },
  "ballot-paper": { fr: "Ballot Paper", en: "Ballot Paper" },
  "boarding-pass": { fr: "Boarding Pass", en: "Boarding Pass" },
  "guide-map": { fr: "Guide Map", en: "Guide Map" },
  standard: { fr: "Qohesion", en: "Qohesion" },
};
/** The blue Qohesion look. An organization starts with it and chooses another template, or brands its own, afterwards. */
export const DEFAULT_THEME: Theme = "standard";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** The template named by the value, or the default. Each organization will choose its own template in its settings. */
export function themeFrom(value: string | null | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}
