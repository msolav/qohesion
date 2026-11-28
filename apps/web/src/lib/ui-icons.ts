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
  mail: "M2 3.5h12v9H2zM2.5 4l5.5 4.6L13.5 4",
  unlock: "M4.5 7V4.6a3 3 0 0 1 6 0v.9M3.5 7h9v6.5h-9zM8 9.6v1.6",
  mask: "M4 6.8l1.1-3.9a1 1 0 0 1 1-.7h3.8a1 1 0 0 1 1 .7L12 6.8M1.5 7h13M5.2 13.8a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zM10.8 13.8a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zM7.4 11.4c.4-.3.8-.3 1.2 0",
  eye: "M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8zM9.8 8a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0z",
  pulse: "M1.5 8h3l2-4.5 3 9 2-4.5h3",
  shield: "M8 1.8l5 1.8v4c0 3-2.1 5.2-5 6.4-2.9-1.2-5-3.4-5-6.4v-4z",
  globe: "M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0zM2 8h12M8 2c1.7 1.7 2.5 3.7 2.5 6S9.7 12.3 8 14c-1.7-1.7-2.5-3.7-2.5-6S6.3 3.7 8 2z",
  key: "M13.5 5.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM7.9 7.6L2.5 13M4.5 11l1.7 1.7",
  layout: "M2.5 3h11v10h-11zM2.5 6.5h11M6 6.5V13",
  info: "M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0zM8 7.2v3.6M8 5h.01",
  ballot: "M2.5 8h11v5.5h-11zM4.5 8l1-4.5h5L11.5 8M6.2 10.7l1.2 1.2 2.4-2.6",
  hash: "M6 2.5l-1 11M11.5 2.5l-1 11M3 6h10.5M2.5 10h10.5",
  approved: "M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0zM5.5 8.2l1.8 1.8 3.2-3.6",
  tickList: "M2.5 4.5l1.2 1.2 2-2.4M2.5 10.5l1.2 1.2 2-2.4M8 4.5h5.5M8 10.5h5.5",
  rounds: "M3 8a5 5 0 0 1 9-3M12.5 2.5v3h-3M13 8a5 5 0 0 1-9 3M3.5 13.5v-3h3",
  ranking: "M3 13.5V9.5M8 13.5V3.5M13 13.5V7M2 13.5h12",
  bars: "M3 13.5V8M6.5 13.5V4M10 13.5V6.5M13.5 13.5V10",
  scale: "M8 2.5v11M4.5 13.5h7M2.5 5h11M4 5L2 9.5h4zM12 5l-2 4.5h4z",
  pairs: "M2.5 5.5h6M2.5 10.5h6M8.5 5.5l5 5M8.5 10.5l5-5",
  star: ICONS["star"]?.d ?? "",
  text: "M3 4h10M8 4v9M5.5 13h5",
  doc: "M4 2.5h5.5L12.5 5.5v8h-8.5zM9.5 2.5v3h3M6 8.5h4.5M6 11h4.5",
};
