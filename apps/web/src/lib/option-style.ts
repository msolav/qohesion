// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The look an organization can give to one option of a poll: an icon and a colour. Both are chosen from short lists so
 * that every combination stays legible in every ballot template and on the console (contrast is checked for the
 * whole palette, see option-style.test.ts). An option with neither takes the mark of its meaning (In favour: check,
 * Against: cross, Abstention: dash) or, for a custom option, a neutral ring.
 */

import type { Locale } from "./i18n/negotiate.js";

/** Icons are drawn on a 16-unit grid with a 2.4 stroke, round caps and joins, no fill. */
export const ICONS: Readonly<Record<string, { readonly d: string; readonly fr: string; readonly en: string }>> = {
  check: { d: "M3.5 8.5l3 3 6-7", fr: "Crochet", en: "Check" },
  cross: { d: "M4 4l8 8M12 4l-8 8", fr: "Croix", en: "Cross" },
  dash: { d: "M4 8h8", fr: "Tiret", en: "Dash" },
  plus: { d: "M8 3.5v9M3.5 8h9", fr: "Plus", en: "Plus" },
  heart: { d: "M8 13.2C3 9.7 3 5.2 5.6 4.3c1.2-.4 2.2.2 2.4 1 .2-.8 1.2-1.4 2.4-1 2.6.9 2.6 5.4-2.4 8.9z", fr: "Cœur", en: "Heart" },
  star: { d: "M8 2.6l1.7 3.5 3.8.5-2.8 2.7.7 3.8L8 11.3l-3.4 1.8.7-3.8L2.5 6.6l3.8-.5z", fr: "Étoile", en: "Star" },
  flag: { d: "M4 14V2.5M4 3h8l-1.8 2.8L12 8.6H4", fr: "Drapeau", en: "Flag" },
  home: { d: "M2.5 8L8 3l5.5 5M4 7v6.5h8V7M6.8 13.5V10h2.4v3.5", fr: "Maison", en: "Home" },
  sun: { d: "M10.6 8a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0zM8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2", fr: "Soleil", en: "Sun" },
  moon: { d: "M12.8 9.6A5.4 5.4 0 0 1 6.4 3.2a5.4 5.4 0 1 0 6.4 6.4z", fr: "Lune", en: "Moon" },
  leaf: { d: "M3 13c0-6 3.5-9.5 10-10 .3 6.5-3.2 10-9.2 10M3 13l5-5", fr: "Feuille", en: "Leaf" },
  bolt: { d: "M9 2L4 9h3.5L7 14l5-7H8.5z", fr: "Éclair", en: "Bolt" },
  clock: { d: "M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0zM8 4.5V8l2.5 1.5", fr: "Horloge", en: "Clock" },
  users: { d: "M6 7.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM2.2 13c0-2.1 1.7-3.6 3.8-3.6s3.8 1.5 3.8 3.6M11 6.8a1.8 1.8 0 1 0 0-3.6M11.5 9.6c1.6.2 2.8 1.4 2.8 3.4", fr: "Personnes", en: "People" },
  tree: { d: "M8 14v-3M8 11.5c-2.7 0-4.2-1.7-4.2-3.6 0-1.2.6-2 1.5-2.5-.2-2 1.2-3.3 2.7-3.3s2.9 1.3 2.7 3.3c.9.5 1.5 1.3 1.5 2.5 0 1.9-1.5 3.6-4.2 3.6z", fr: "Arbre", en: "Tree" },
  question: { d: "M6 6a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6M8 12.2h.01", fr: "Question", en: "Question" },
};
export const ICON_IDS: readonly string[] = Object.keys(ICONS);

/**
 * Colours: `ballot` is used on the ballot templates (light surfaces), `night` on the navy console. Each is at least 3:1
 * against the surfaces it sits on, which the test checks.
 */
export const COLORS: Readonly<Record<string, { readonly ballot: string; readonly night: string; readonly fr: string; readonly en: string }>> = {
  green: { ballot: "#1F5C46", night: "#7FD1A4", fr: "Vert", en: "Green" },
  red: { ballot: "#B3261E", night: "#FF9C93", fr: "Rouge", en: "Red" },
  grey: { ballot: "#4C4C47", night: "#C9D8F2", fr: "Gris", en: "Grey" },
  blue: { ballot: "#1D4ED8", night: "#8FB4FF", fr: "Bleu", en: "Blue" },
  teal: { ballot: "#0F766E", night: "#5EEAD4", fr: "Sarcelle", en: "Teal" },
  amber: { ballot: "#8A5A00", night: "#F2C879", fr: "Ambre", en: "Amber" },
  pink: { ballot: "#9D174D", night: "#F9A8D4", fr: "Rose", en: "Pink" },
};
export const COLOR_IDS: readonly string[] = Object.keys(COLORS);

export const isIconId = (value: unknown): value is string => typeof value === "string" && Object.hasOwn(ICONS, value);
export const isColorId = (value: unknown): value is string => typeof value === "string" && Object.hasOwn(COLORS, value);

/** The icon an option shows: the one chosen, else the mark of the three fixed meanings, else none. */
const MEANING: Readonly<Record<string, string>> = { for: "check", against: "cross", abstain: "dash" };
export function iconOf(option: { id: string; icon?: string | null }): string | null {
  if (option.icon && isIconId(option.icon)) return option.icon;
  return MEANING[option.id] ?? null;
}
export function iconPath(id: string | null): string | null {
  return id && isIconId(id) ? (ICONS[id]?.d ?? null) : null;
}
export function iconName(id: string, locale: Locale): string {
  return ICONS[id]?.[locale] ?? id;
}
export function colorName(id: string, locale: Locale): string {
  return COLORS[id]?.[locale] ?? id;
}
