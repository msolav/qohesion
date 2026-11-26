export const THEMES = ["seed-packet", "ballot-paper"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "seed-packet";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** The template named by the value, or the default. Each organization will choose its own template in its settings. */
export function themeFrom(value: string | null | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}
