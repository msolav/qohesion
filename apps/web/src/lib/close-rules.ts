// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * When a poll closes by itself, apart from its deadline and from an administrator closing it (which are always possible).
 * Any one of the rules closes the poll as soon as it holds. They are fixed when the poll opens, like the results settings,
 * and the ballot says so.
 */

export type Threshold = "majority" | number;

export interface CloseRules {
  /** Close after this many members have voted. */
  readonly afterVotes: number | null;
  /** Close when this share of the roll has voted, in whole percent. 100 means everyone. */
  readonly turnoutPercent: number | null;
  /** Close when one option reaches "majority" (more than half of the roll) or this share of the roll, in whole percent. */
  readonly threshold: Threshold | null;
}

export const NO_RULES: CloseRules = { afterVotes: null, turnoutPercent: null, threshold: null };

export interface Situation {
  /** Addresses on the roll now. */
  readonly rollSize: number;
  /** Members who have voted. */
  readonly voters: number;
  /** Ballots for each option. Null while the ballots cannot be read (sealed). */
  readonly counts: Readonly<Record<string, number>> | null;
}

const isCount = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= max;

/** The code of the first problem with the rules, or null. */
export function ruleProblem(rules: CloseRules, encrypted: boolean): string | null {
  if (rules.afterVotes !== null && !isCount(rules.afterVotes, 100_000)) return "invalid_rule";
  if (rules.turnoutPercent !== null && !isCount(rules.turnoutPercent, 100)) return "invalid_rule";
  if (rules.threshold !== null && rules.threshold !== "majority" && !isCount(rules.threshold, 100)) return "invalid_rule";
  // Reading a threshold needs the totals while voting runs, which sealed ballots do not allow.
  if (rules.threshold !== null && encrypted) return "rules_need_readable";
  return null;
}

/** The rule that now holds, as a short code, or null when the poll stays open. */
export function closeReason(rules: CloseRules, s: Situation): "votes" | "turnout" | "threshold" | null {
  if (rules.afterVotes !== null && s.voters >= rules.afterVotes) return "votes";
  if (rules.turnoutPercent !== null && s.rollSize > 0 && s.voters * 100 >= rules.turnoutPercent * s.rollSize) return "turnout";
  if (rules.threshold !== null && s.counts !== null && s.rollSize > 0) {
    for (const n of Object.values(s.counts)) {
      if (rules.threshold === "majority" ? n * 2 > s.rollSize : n * 100 >= rules.threshold * s.rollSize) return "threshold";
    }
  }
  return null;
}

export function parseRules(json: string | null | undefined): CloseRules {
  if (!json) return NO_RULES;
  try {
    const raw = JSON.parse(json) as Partial<Record<keyof CloseRules, unknown>>;
    const threshold = raw.threshold === "majority" || typeof raw.threshold === "number" ? raw.threshold : null;
    return {
      afterVotes: typeof raw.afterVotes === "number" ? raw.afterVotes : null,
      turnoutPercent: typeof raw.turnoutPercent === "number" ? raw.turnoutPercent : null,
      threshold,
    };
  } catch {
    return NO_RULES;
  }
}

export const hasRules = (r: CloseRules): boolean => r.afterVotes !== null || r.turnoutPercent !== null || r.threshold !== null;
