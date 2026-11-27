// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { isColorId, isIconId } from "./option-style.js";
import type { OptionInput, PollInput } from "./server/service.js";
import { isAudience, isTiming } from "./results-rules.js";
import { isTheme } from "./theme.js";

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

/** Reads the poll form. Anything the form cannot produce falls back to a value the service then refuses or accepts as a default. */
export function parsePollForm(data: FormData): PollInput {
  const timing = text(data, "timing");
  const audience = text(data, "audience");
  const theme = text(data, "theme");
  const hours = text(data, "hours").trim();
  const byHours = text(data, "duration") === "hours";
  return {
    title: text(data, "title"),
    description: text(data, "description"),
    kind: text(data, "kind") === "choice" ? "choice" : "yes-no",
    options: parseOptions(data),
    timing: isTiming(timing) ? timing : "close",
    audience: isAudience(audience) ? audience : "voters",
    theme: isTheme(theme) ? theme : "ballot-paper",
    encrypted: text(data, "encryption") === "sealed",
    closeAfterHours: byHours ? (/^\d+$/.test(hours) ? Number(hours) : Number.NaN) : null,
  };
}
