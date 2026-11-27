// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { approvalRequired, decide, isDelay, type AbstentionMeaning, type ApprovalPolicy, type ApprovalRule } from "./approval.js";

const policy = (rule: ApprovalRule, abstention: AbstentionMeaning = "neutral"): ApprovalPolicy => ({ rule, abstention, delayHours: 168 });
const run = (p: ApprovalPolicy, eligible: number, approvals: number, rejections = 0, abstentions = 0, expired = false) =>
  decide({ policy: p, eligible, approvals, rejections, abstentions, expired }).outcome;

describe("approvalRequired", () => {
  it("needs a rule and at least two administrators", () => {
    expect(approvalRequired(policy("none"), 3)).toBe(false);
    expect(approvalRequired(policy("majority"), 1)).toBe(false);
    expect(approvalRequired(policy("majority"), 2)).toBe(true);
  });
});

describe("decide", () => {
  it("lets everything through without a rule or with one administrator", () => {
    expect(run(policy("none"), 3, 1)).toBe("approved");
    expect(run(policy("all"), 1, 1)).toBe("approved");
  });

  it("is never approved by the proposer alone", () => {
    expect(run(policy("majority"), 2, 1)).toBe("pending");
    expect(run(policy("majority"), 3, 1)).toBe("pending");
  });

  it("majority: more than half", () => {
    expect(run(policy("majority"), 3, 2)).toBe("approved");
    expect(run(policy("majority"), 4, 2)).toBe("pending");
    expect(run(policy("majority"), 4, 3)).toBe("approved");
    expect(run(policy("majority"), 5, 3)).toBe("approved");
  });

  it("all: every administrator", () => {
    expect(run(policy("all"), 3, 2)).toBe("pending");
    expect(run(policy("all"), 3, 3)).toBe("approved");
    expect(run(policy("all"), 2, 2)).toBe("approved");
  });

  it("is rejected as soon as it can no longer be approved", () => {
    expect(run(policy("majority"), 3, 1, 2)).toBe("rejected");
    expect(run(policy("majority"), 3, 1, 1)).toBe("pending");
    expect(run(policy("all"), 3, 2, 1)).toBe("rejected");
    expect(run(policy("majority"), 2, 1, 1)).toBe("rejected");
  });

  it("lapses at the end of its delay when still undecided", () => {
    expect(run(policy("majority"), 3, 1, 0, 0, true)).toBe("lapsed");
    expect(run(policy("majority"), 3, 2, 0, 0, true)).toBe("approved");
    expect(run(policy("majority"), 3, 1, 2, 0, true)).toBe("rejected");
  });

  describe("abstention, three administrators, rule majority, one approval and two abstentions", () => {
    it("agreement counts as approval", () => expect(run(policy("majority", "agreement"), 3, 1, 0, 2)).toBe("approved"));
    it("neutral leaves it pending", () => expect(run(policy("majority", "neutral"), 3, 1, 0, 2)).toBe("pending"));
    it("discarded leaves one administrator, which cannot meet the two-person minimum", () => expect(run(policy("majority", "discarded"), 3, 1, 0, 2)).toBe("rejected"));
    it("disagreement counts as rejection", () => expect(run(policy("majority", "disagreement"), 3, 1, 0, 2)).toBe("rejected"));
  });

  it("discarded: one abstention leaves the others to decide", () => {
    expect(run(policy("all", "discarded"), 3, 2, 0, 1)).toBe("approved");
    expect(run(policy("majority", "discarded"), 4, 2, 0, 1)).toBe("approved");
  });

  it("reports what was counted", () => {
    expect(decide({ policy: policy("majority", "agreement"), eligible: 3, approvals: 1, rejections: 0, abstentions: 1, expired: false })).toMatchObject({ approvals: 2, needed: 2, eligible: 3 });
  });
});

describe("isDelay", () => {
  it("accepts one hour to ninety days", () => {
    expect(isDelay(1)).toBe(true);
    expect(isDelay(2160)).toBe(true);
    expect(isDelay(0)).toBe(false);
    expect(isDelay(2161)).toBe(false);
    expect(isDelay(1.5)).toBe(false);
  });
});
