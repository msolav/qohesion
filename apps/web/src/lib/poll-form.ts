// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { isColorId, isIconId } from "./option-style.js";
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
 * The options, in the order they were written. The three fields of an option (text, icon, colour) arrive as lists of the
 * same length, so they pair up by position; an unknown icon or colour becomes none, and a row with no text is dropped.
 */
export function parseOptions(data: FormData): OptionInput[] {
  const labels = data.getAll("option");
  const icons = data.getAll("option_icon");
  const colors = data.getAll("option_color");
  const options: OptionInput[] = [];
  labels.forEach((label, i) => {
    const text = typeof label === "string" ? label : "";
    const icon = icons[i];
    const color = colors[i];
    options.push({ label: text, icon: isIconId(icon) ? icon : null, color: isColorId(color) ? color : null });
  });
  return options.filter((o) => o.label.trim().length > 0);
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
  return {
    title: text(data, "title"),
    description: text(data, "description"),
    kind: text(data, "kind") === "choice" ? "choice" : "yes-no",
    options: parseOptions(data),
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
  };
}
