// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { PollInput } from "./server/service.js";
import { isAudience, isTiming } from "./results-rules.js";
import { isTheme } from "./theme.js";

const text = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

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
    options: data.getAll("option").map((o) => (typeof o === "string" ? o : "")),
    timing: isTiming(timing) ? timing : "close",
    audience: isAudience(audience) ? audience : "voters",
    theme: isTheme(theme) ? theme : "ballot-paper",
    encrypted: text(data, "encryption") === "sealed",
    closeAfterHours: byHours ? (/^\d+$/.test(hours) ? Number(hours) : Number.NaN) : null,
  };
}
