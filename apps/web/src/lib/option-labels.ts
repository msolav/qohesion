// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Locale } from "./i18n/negotiate.js";

const FIXED: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  fr: { for: "Pour", against: "Contre", abstain: "Abstention" },
  en: { for: "In favour", against: "Against", abstain: "Abstention" },
};

/** The text of an option. The three fixed options of a yes-no poll are written in the interface language. */
export function optionLabel(locale: Locale, option: { id: string; label: string | null }): string {
  return option.label ?? FIXED[locale][option.id] ?? option.id;
}

/** The mark of an option: a check, a cross, a dash. Other options have none. */
export const OPTION_GLYPHS: Readonly<Record<string, string>> = { for: "M3.5 8.5l3 3 6-7", against: "M4 4l8 8M12 4l-8 8", abstain: "M4 8h8" };
