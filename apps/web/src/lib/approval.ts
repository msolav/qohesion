// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The decision of an approval request (ADR 0009). Pure: it takes the policy, the number of eligible administrators and
 * the answers so far, and says whether the request is approved, rejected, still pending or lapsed.
 */

export type ApprovalRule = "none" | "majority" | "all";
export type AbstentionMeaning = "agreement" | "disagreement" | "neutral" | "discarded";
export type Answer = "approve" | "reject" | "abstain";
export type Outcome = "approved" | "rejected" | "pending" | "lapsed";

export interface ApprovalPolicy {
  readonly rule: ApprovalRule;
  readonly abstention: AbstentionMeaning;
  /** How long a request stays open, in hours. */
  readonly delayHours: number;
}

export const NO_APPROVAL: ApprovalPolicy = { rule: "none", abstention: "neutral", delayHours: 168 };
export const MIN_DELAY_HOURS = 1;
export const MAX_DELAY_HOURS = 90 * 24;

const RULES: readonly ApprovalRule[] = ["none", "majority", "all"];
const MEANINGS: readonly AbstentionMeaning[] = ["agreement", "disagreement", "neutral", "discarded"];

export const isRule = (v: unknown): v is ApprovalRule => typeof v === "string" && (RULES as readonly string[]).includes(v);
export const isMeaning = (v: unknown): v is AbstentionMeaning => typeof v === "string" && (MEANINGS as readonly string[]).includes(v);
export const isDelay = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= MIN_DELAY_HOURS && v <= MAX_DELAY_HOURS;

/** Whether requests are needed at all: a rule other than none, and at least two administrators to answer. */
export function approvalRequired(policy: ApprovalPolicy, administrators: number): boolean {
  return policy.rule !== "none" && administrators >= 2;
}

export interface Tally {
  readonly outcome: Outcome;
  /** Approvals counted, abstentions that count as approval included. */
  readonly approvals: number;
  readonly rejections: number;
  readonly abstentions: number;
  /** Administrators who count for this request (those left out by a "discarded" abstention are not). */
  readonly eligible: number;
  /** Approvals needed. */
  readonly needed: number;
}

export interface DecideInput {
  readonly policy: ApprovalPolicy;
  /** Eligible administrators when the request was made. */
  readonly eligible: number;
  readonly approvals: number;
  readonly rejections: number;
  readonly abstentions: number;
  /** The request's delay has passed. */
  readonly expired: boolean;
}

export function decide(input: DecideInput): Tally {
  const { policy, abstentions } = input;
  let approvals = input.approvals;
  let rejections = input.rejections;
  let eligible = input.eligible;
  if (policy.abstention === "agreement") approvals += abstentions;
  else if (policy.abstention === "disagreement") rejections += abstentions;
  else if (policy.abstention === "discarded") eligible -= abstentions;

  // With one administrator, or no rule, nothing can be approved by someone else, so the request goes through.
  if (!approvalRequired(policy, input.eligible)) return { outcome: "approved", approvals, rejections, abstentions, eligible, needed: 0 };

  // Never approved by one person alone, whatever the rule says.
  const base = policy.rule === "all" ? eligible : Math.floor(eligible / 2) + 1;
  const needed = Math.max(base, 2);
  const tally = { approvals, rejections, abstentions, eligible, needed };
  if (approvals >= needed) return { outcome: "approved", ...tally };
  // Those who have not rejected, and abstained neutrally or not yet answered, could still approve.
  if (eligible - rejections < needed) return { outcome: "rejected", ...tally };
  return { outcome: input.expired ? "lapsed" : "pending", ...tally };
}
