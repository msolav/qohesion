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
  /** ISO 8601 time. */
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

export function approvalCount(a: Amendment): number {
  return new Set(a.approvedBy.filter((who) => who !== a.author)).size;
}

export function isApproved(a: Amendment, level: AssuranceLevel): boolean {
  return approvalCount(a) >= approvalsRequired(level);
}

export interface AmendedRoll extends FrozenRoll {
  /** Approved amendments made once voting had started: the group sees them as "added late". */
  readonly late: readonly Amendment[];
  /** Amendments still waiting for approval. They have no effect yet. */
  readonly pending: readonly Amendment[];
}

/** Applies approved amendments, oldest first, to the frozen roll. The count and code are those of the result. */
export function applyAmendments(base: Iterable<string>, amendments: readonly Amendment[], level: AssuranceLevel): AmendedRoll {
  const set = new Set(base);
  const late: Amendment[] = [];
  const pending: Amendment[] = [];
  for (const a of [...amendments].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : x.id.localeCompare(y.id)))) {
    if (!isApproved(a, level)) { pending.push(a); continue; }
    if (a.kind === "added") set.add(a.fingerprint); else set.delete(a.fingerprint);
    if (a.phase === "voting") late.push(a);
  }
  const frozen = freezeRoll(set);
  return { ...frozen, late, pending };
}
