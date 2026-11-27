// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { NO_RULES, closeReason, hasRules, parseRules, ruleProblem } from "./close-rules.js";

const counts = (f: number, a: number, x = 0) => ({ for: f, against: a, abstain: x });

describe("close rules", () => {
  it("stay open with no rule, whatever happens", () => {
    expect(closeReason(NO_RULES, { rollSize: 10, voters: 10, counts: counts(10, 0) })).toBeNull();
    expect(hasRules(NO_RULES)).toBe(false);
  });

  it("close after a number of votes", () => {
    const rules = { ...NO_RULES, afterVotes: 5 };
    expect(closeReason(rules, { rollSize: 20, voters: 4, counts: null })).toBeNull();
    expect(closeReason(rules, { rollSize: 20, voters: 5, counts: null })).toBe("votes");
  });

  it("close at a share of the roll, and at everyone with 100", () => {
    const half = { ...NO_RULES, turnoutPercent: 50 };
    expect(closeReason(half, { rollSize: 7, voters: 3, counts: null })).toBeNull(); // 42.9 %
    expect(closeReason(half, { rollSize: 7, voters: 4, counts: null })).toBe("turnout"); // 57 %
    const all = { ...NO_RULES, turnoutPercent: 100 };
    expect(closeReason(all, { rollSize: 3, voters: 2, counts: null })).toBeNull();
    expect(closeReason(all, { rollSize: 3, voters: 3, counts: null })).toBe("turnout");
  });

  it("close when an option holds more than half of the roll, not exactly half", () => {
    const rules = { ...NO_RULES, threshold: "majority" as const };
    expect(closeReason(rules, { rollSize: 10, voters: 5, counts: counts(5, 0) })).toBeNull();
    expect(closeReason(rules, { rollSize: 10, voters: 6, counts: counts(6, 0) })).toBe("threshold");
    expect(closeReason(rules, { rollSize: 10, voters: 6, counts: counts(0, 6) })).toBe("threshold");
    expect(closeReason(rules, { rollSize: 11, voters: 6, counts: counts(6, 0) })).toBe("threshold");
  });

  it("close when an option reaches a share of the roll, counted on the roll and not on the votes cast", () => {
    const rules = { ...NO_RULES, threshold: 60 };
    expect(closeReason(rules, { rollSize: 10, voters: 5, counts: counts(5, 0) })).toBeNull();
    expect(closeReason(rules, { rollSize: 10, voters: 6, counts: counts(6, 0) })).toBe("threshold");
  });

  it("cannot read a threshold from sealed ballots, and refuses the combination", () => {
    expect(closeReason({ ...NO_RULES, threshold: "majority" }, { rollSize: 4, voters: 4, counts: null })).toBeNull();
    expect(ruleProblem({ ...NO_RULES, threshold: "majority" }, true)).toBe("rules_need_readable");
    expect(ruleProblem({ ...NO_RULES, afterVotes: 3, turnoutPercent: 100 }, true)).toBeNull();
  });

  it("refuses values that are not whole numbers in range", () => {
    for (const bad of [{ afterVotes: 0 }, { afterVotes: 1.5 }, { turnoutPercent: 101 }, { turnoutPercent: 0 }, { threshold: 0 }, { threshold: 150 }]) {
      expect(ruleProblem({ ...NO_RULES, ...bad }, false), JSON.stringify(bad)).toBe("invalid_rule");
    }
    expect(ruleProblem({ afterVotes: 12, turnoutPercent: 60, threshold: 51 }, false)).toBeNull();
  });

  it("reads stored rules and falls back to none", () => {
    expect(parseRules('{"afterVotes":5,"turnoutPercent":null,"threshold":"majority"}')).toEqual({ afterVotes: 5, turnoutPercent: null, threshold: "majority" });
    expect(parseRules("not json")).toEqual(NO_RULES);
    expect(parseRules(null)).toEqual(NO_RULES);
  });
});
