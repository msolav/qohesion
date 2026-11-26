import { createHash } from "node:crypto";
import type { AssuranceLevel } from "./assurance.js";
import type { RollPhase } from "./status.js";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function crockford(bytes: Uint8Array, chars: number): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      bits -= 5;
      out += CROCKFORD[(value >> bits) & 31];
    }
    value &= (1 << bits) - 1;
    if (out.length >= chars) break;
  }
  return out;
}

const FINGERPRINT = /^[A-Za-z0-9_-]+$/;

/**
 * Short code that identifies the exact list of registered addresses (as fingerprints). The order does not matter,
 * duplicates count once, and any change to the list changes the code. Format: XXXX-XXXX-XXXX.
 * Every fingerprint must be non-empty base64url text, so that two different lists never produce the same input.
 *
 * Verification format version 1: SHA-256 of "qohesion-roll-v1\n" followed by each sorted fingerprint and a line feed,
 * first 60 bits written in Crockford base32. Changing this breaks the check of past votes.
 */
export function rollCode(fingerprints: Iterable<string>): string {
  const unique = [...new Set(fingerprints)].sort();
  for (const f of unique) if (!FINGERPRINT.test(f)) throw new Error("Invalid fingerprint");
  const digest = createHash("sha256").update(`qohesion-roll-v1\n${unique.map((f) => `${f}\n`).join("")}`).digest();
  const text = crockford(digest, 12);
  return `${text.slice(0, 4)}-${text.slice(4, 8)}-${text.slice(8, 12)}`;
}

export interface FrozenRoll {
  readonly count: number;
  readonly code: string;
  readonly fingerprints: readonly string[];
}

/** Freezes the roll at the end of registration: the count and the code are published. */
export function freezeRoll(confirmed: Iterable<string>): FrozenRoll {
  const fingerprints = [...new Set(confirmed)].sort();
  return { count: fingerprints.length, code: rollCode(fingerprints), fingerprints };
}

export type AmendmentKind = "added" | "removed";

/** A change to the roll. It is recorded with its time and author, and may need approval by other administrators. */
export interface Amendment {
  readonly id: string;
  readonly kind: AmendmentKind;
  readonly fingerprint: string;
  /** ISO 8601 time with an offset or Z, for example 2027-03-01T15:00:00Z. */
  readonly at: string;
  readonly author: string;
  readonly approvedBy: readonly string[];
  /** The phase in which the amendment was made. */
  readonly phase: RollPhase;
}

/** Approvals needed from administrators other than the author: none for informal votes, one for formal, two for reinforced. */
export function approvalsRequired(level: AssuranceLevel): number {
  return level === "informal" ? 0 : level === "formal" ? 1 : 2;
}

const identity = (who: string): string => who.trim().toLowerCase();

/** Distinct approvers other than the author. Names are compared without regard to case or surrounding spaces. */
export function approvalCount(a: Amendment): number {
  const author = identity(a.author);
  const approvers = a.approvedBy.map(identity).filter((who) => who !== "" && who !== author);
  return new Set(approvers).size;
}

export function isApproved(a: Amendment, level: AssuranceLevel): boolean {
  return approvalCount(a) >= approvalsRequired(level);
}

export interface AmendedRoll extends FrozenRoll {
  /** Approved amendments made after the freeze (while frozen or during voting): the group sees them as "added late". */
  readonly late: readonly Amendment[];
  /** Amendments still waiting for approval. They have no effect yet. */
  readonly pending: readonly Amendment[];
}

const OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

/** The instant of an amendment. A time without an offset would depend on the server's zone, so it is refused. */
function instant(a: Amendment): number {
  const t = OFFSET.test(a.at) ? Date.parse(a.at) : Number.NaN;
  if (Number.isNaN(t)) throw new Error(`Invalid amendment time: ${a.at}`);
  return t;
}

/**
 * Applies approved amendments to the frozen roll, oldest first by instant (not by the text of the time), with ties
 * broken by comparing identifiers code unit by code unit. The count and code are those of the result.
 */
export function applyAmendments(base: Iterable<string>, amendments: readonly Amendment[], level: AssuranceLevel): AmendedRoll {
  const set = new Set(base);
  const late: Amendment[] = [];
  const pending: Amendment[] = [];
  const ordered = amendments
    .map((a) => ({ a, t: instant(a) }))
    .sort((x, y) => x.t - y.t || (x.a.id < y.a.id ? -1 : x.a.id > y.a.id ? 1 : 0));
  for (const { a } of ordered) {
    if (!isApproved(a, level)) { pending.push(a); continue; }
    if (a.kind === "added") set.add(a.fingerprint); else set.delete(a.fingerprint);
    if (a.phase !== "registration") late.push(a);
  }
  const frozen = freezeRoll(set);
  return { ...frozen, late, pending };
}
