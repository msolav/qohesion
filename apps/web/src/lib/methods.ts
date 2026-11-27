// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The voting methods Qohesion describes (ADR 0011). A method is listed here with its family, its icon and whether it is
 * built; its name and its description are in `i18n/guide.ts`. Only built methods are offered when a poll is made.
 */

export type MethodState = "built" | "planned";
export type MethodFamily = "decision" | "seats" | "opinion";

export interface MethodInfo {
  readonly id: MethodId;
  readonly family: MethodFamily;
  readonly icon: string;
  readonly state: MethodState;
}

export const METHOD_IDS = [
  "yes-no", "single", "majority", "two-round", "approval", "ranked", "condorcet", "borda", "score", "grading", "star", "consent",
  "block", "stv", "lists",
  "allocation", "quadratic", "rating", "text",
] as const;
export type MethodId = (typeof METHOD_IDS)[number];

export const METHODS: readonly MethodInfo[] = [
  { id: "yes-no", family: "decision", icon: "check", state: "built" },
  { id: "single", family: "decision", icon: "flag", state: "built" },
  { id: "majority", family: "decision", icon: "shield", state: "planned" },
  { id: "two-round", family: "decision", icon: "rounds", state: "planned" },
  { id: "approval", family: "decision", icon: "tickList", state: "planned" },
  { id: "ranked", family: "decision", icon: "ranking", state: "planned" },
  { id: "condorcet", family: "decision", icon: "pairs", state: "planned" },
  { id: "borda", family: "decision", icon: "ranking", state: "planned" },
  { id: "score", family: "decision", icon: "bars", state: "planned" },
  { id: "grading", family: "decision", icon: "scale", state: "planned" },
  { id: "star", family: "decision", icon: "star", state: "planned" },
  { id: "consent", family: "decision", icon: "users", state: "planned" },
  { id: "block", family: "seats", icon: "users", state: "planned" },
  { id: "stv", family: "seats", icon: "ranking", state: "planned" },
  { id: "lists", family: "seats", icon: "list", state: "planned" },
  { id: "allocation", family: "opinion", icon: "bars", state: "planned" },
  { id: "quadratic", family: "opinion", icon: "bars", state: "planned" },
  { id: "rating", family: "opinion", icon: "scale", state: "planned" },
  { id: "text", family: "opinion", icon: "text", state: "planned" },
];

/** The method a question of the poll is counted by today. */
export const methodOfType = (type: "yes-no" | "single"): MethodId => type;
