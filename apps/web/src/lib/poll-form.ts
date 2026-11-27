// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { isColorId, isIconId } from "./option-style.js";
import { isAutoReminder, type AutoReminder } from "./auto-reminder.js";
import { cleanLanguages, isLang, type Lang, type Translations } from "./poll-i18n.js";
import type { OptionInput, PollInput } from "./server/service.js";
import { isAudience, isTiming } from "./results-rules.js";
import { DEFAULT_THEME, isTheme } from "./theme.js";
import { DEFAULT_TIME_ZONE, zonedToUtc } from "./zoned.js";
import type { CloseRules } from "./close-rules.js";

const text = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

/**
 * The options, in the order they were written, with their texts in every language offered. The fields of an option (its text
 * in each language, its icon, its colour) arrive as lists of the same length, so they pair up by position. A row with no text
 * in the default language is dropped, with its other texts; an unknown icon or colour becomes none.
 */
export function parseOptionRows(data: FormData, languages: readonly Lang[]): { options: OptionInput[]; texts: Partial<Record<Lang, string>>[] } {
  const def = languages[0];
  const names = def ? languages.map((l) => [l, `option_${l}`] as const) : ([["fr", "option"]] as const);
  const base = data.getAll(def ? `option_${def}` : "option");
  const icons = data.getAll("option_icon");
  const colors = data.getAll("option_color");
  const options: OptionInput[] = [];
  const texts: Partial<Record<Lang, string>>[] = [];
  base.forEach((label, i) => {
    const typed = typeof label === "string" ? label : "";
    if (typed.trim().length === 0) return;
    const icon = icons[i];
    const color = colors[i];
    options.push({ label: typed, icon: isIconId(icon) ? icon : null, color: isColorId(color) ? color : null });
    const row: Partial<Record<Lang, string>> = {};
    for (const [lang, name] of names) {
      const value = data.getAll(name)[i];
      if (typeof value === "string") row[lang] = value;
    }
    texts.push(row);
  });
  return { options, texts };
}

/** Kept for forms that carry one language only. */
export function parseOptions(data: FormData): OptionInput[] {
  return parseOptionRows(data, []).options;
}

const whole = (value: string): number => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN);

/** The closing rules the form describes. A rule that is ticked with a value that is not a whole number is refused by the service. */
export function parseRules(data: FormData): CloseRules {
  const threshold = text(data, "rule_threshold");
  return {
    afterVotes: text(data, "rule_votes") === "yes" ? whole(text(data, "rule_votes_n")) : null,
    turnoutPercent: text(data, "rule_turnout") === "yes" ? whole(text(data, "rule_turnout_p")) : null,
    threshold: threshold === "majority" ? "majority" : threshold === "percent" ? whole(text(data, "rule_threshold_p")) : null,
  };
}

/**
 * Reads the poll form. The dates are typed in the time zone of the organization and become instants. Anything the form
 * cannot produce falls back to a value the service then refuses or accepts as a default.
 */
export function parsePollForm(data: FormData, timeZone: string = DEFAULT_TIME_ZONE): PollInput {
  const timing = text(data, "timing");
  const audience = text(data, "audience");
  const theme = text(data, "theme");
  // The languages offered: the default one first, then the others in the usual order. A form without any carries one language.
  const chosen = cleanLanguages(data.getAll("languages"));
  const wantedDefault = text(data, "default_language");
  const languages = chosen.length === 0 ? [] : isLang(wantedDefault) && chosen.includes(wantedDefault) ? [wantedDefault, ...chosen.filter((l) => l !== wantedDefault)] : chosen;
  const def = languages[0];
  const pick = (name: string): string => text(data, def ? `${name}_${def}` : name);
  const kind = text(data, "kind") === "choice" ? "choice" : "yes-no";
  const rows = parseOptionRows(data, languages);
  const translations: Translations = def
    ? {
        languages,
        title: Object.fromEntries(languages.map((l) => [l, text(data, `title_${l}`)])),
        question: Object.fromEntries(languages.map((l) => [l, text(data, `question_${l}`)])),
        description: Object.fromEntries(languages.map((l) => [l, text(data, `description_${l}`)])),
        options: kind === "choice" ? rows.texts : [],
      }
    : { languages: [], title: {}, question: {}, description: {}, options: [] };
  return {
    title: pick("title"),
    question: pick("question"),
    description: pick("description"),
    kind,
    options: rows.options,
    translations,
    timing: isTiming(timing) ? timing : "close",
    audience: isAudience(audience) ? audience : "voters",
    theme: isTheme(theme) ? theme : DEFAULT_THEME,
    encrypted: text(data, "encryption") === "sealed",
    markFill: text(data, "marks") === "fill",
    anonymity: text(data, "anonymity") === "named" ? "named" : "secret",
    opensAt: text(data, "opens_mode") === "date" ? (zonedToUtc(text(data, "opens_at"), timeZone) ?? "invalid") : null,
    closesAt: zonedToUtc(text(data, "closes_at"), timeZone) ?? "",
    rules: parseRules(data),
    allowChange: text(data, "allow_change") === "yes",
    autoReminder: isAutoReminder(text(data, "auto_reminder")) ? (text(data, "auto_reminder") as AutoReminder) : "none",
    reminderPermission: text(data, "reminder_permission") === "yes",
    publishCount: text(data, "publish_count") === "yes",
    lockCancel: text(data, "lock_cancel") === "yes",
    keyThreshold: text(data, "key_mode") === "shared" ? whole(text(data, "key_threshold")) : 1,
  };
}
