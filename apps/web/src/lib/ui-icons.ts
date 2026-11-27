// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Icons of the console's own controls (cards for the settings of a poll, roles). They share the 16-unit grid and the
 * round strokes of the option icons, which they reuse where one fits, and are decorative: the card's text names the choice.
 */

import { ICONS } from "./option-style.js";

export const UI_ICONS: Readonly<Record<string, string>> = {
  check: ICONS["check"]?.d ?? "",
  flag: ICONS["flag"]?.d ?? "",
  clock: ICONS["clock"]?.d ?? "",
  users: ICONS["users"]?.d ?? "",
  list: "M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01",
  lock: "M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9zM8 9.6v1.6",
  eye: "M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8zM9.8 8a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z",
  pulse: "M1.5 8h3l2-4.5 3 9 2-4.5h3",
  shield: "M8 1.8l5 1.8v4c0 3-2.1 5.2-5 6.4-2.9-1.2-5-3.4-5-6.4v-4z",
  globe: "M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0zM2 8h12M8 2c1.7 1.7 2.5 3.7 2.5 6S9.7 12.3 8 14c-1.7-1.7-2.5-3.7-2.5-6S6.3 3.7 8 2z",
  key: "M13.5 5.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM7.9 7.6L2.5 13M4.5 11l1.7 1.7",
  layout: "M2.5 3h11v10h-11zM2.5 6.5h11M6 6.5V13",
};
