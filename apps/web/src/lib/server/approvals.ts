// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { approvalRequired, decide, type Answer, type ApprovalPolicy, type Tally } from "../approval.js";

/**
 * Requests that need the approval of other administrators (ADR 0009), and the answers to them. This holds the storage
 * and the life of a request. What a request means, and what happens when it is approved, belongs to the service.
 */

/**
 * What a request is for. Changes that need nothing more are applied when approved (`set_policy`, `space_settings`). The
 * others give a permit that the administrator uses by doing the action again: it may need a secret that is never stored
 * (a counting key, a new key), or the exact content that was approved.
 */
export type ApprovalKind = "publish_poll" | "set_policy" | "space_settings" | "open_scheduled" | "close_poll" | "cancel_poll" | "add_roll" | "add_key" | "revoke_key" | "delete_space";
const APPLIED_ON_APPROVAL: ReadonlySet<ApprovalKind> = new Set(["set_policy", "space_settings"]);
export type RequestStatus = "pending" | "approved" | "rejected" | "lapsed" | "applied" | "superseded" | "blocked";

export interface ApprovalAnswer {
  readonly keyId: string;
  readonly label: string;
  readonly answer: Answer;
  readonly at: string;
}

export interface ApprovalRequest {
  readonly id: string;
  readonly spaceId: string;
  readonly kind: ApprovalKind;
  /** What the request is about: a poll's number, or empty for the organization. */
  readonly subject: string;
  /** The digest of exactly what is being approved. */
  readonly digest: string;
  readonly payload: Record<string, unknown>;
  readonly proposerId: string;
  readonly proposer: string;
  /** Eligible administrators when the request was made. */
  readonly eligible: number;
  /** Their keys. Only these can answer, and only their answers count, whoever is added or revoked later. */
  readonly eligibleIds: readonly string[];
  /** The rule that applied when the request was made. A later change of the rule does not change open requests. */
  readonly policy: ApprovalPolicy;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly status: RequestStatus;
  readonly decidedAt: string | null;
  readonly answers: readonly ApprovalAnswer[];
  readonly tally: Tally;
}

export const APPROVAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, kind TEXT NOT NULL, subject TEXT NOT NULL,
  digest TEXT NOT NULL, payload TEXT NOT NULL, proposer_id TEXT NOT NULL, proposer_label TEXT NOT NULL, eligible INTEGER NOT NULL,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, status TEXT NOT NULL, decided_at TEXT);
CREATE INDEX IF NOT EXISTS approval_requests_space ON approval_requests (space_id, status);
CREATE TABLE IF NOT EXISTS approval_answers (
  request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE, key_id TEXT NOT NULL, label TEXT NOT NULL,
  answer TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (request_id, key_id));
`;

export interface ApprovalContext {
  policyOf(spaceId: string): ApprovalPolicy;
  /** Keys with the administrator role that are not revoked. */
  administratorsOf(spaceId: string): { id: string; label: string }[];
  /** Carries out an approved request. False when it cannot be done any more. */
  apply(request: ApprovalRequest): boolean;
  /** Adds an event to the organization's record. */
  log(spaceId: string, kind: string, actor: string, detail: Record<string, unknown>): void;
}

export interface Proposer {
  readonly keyId: string;
  readonly label: string;
}

const ONE_HOUR = 3_600_000;

export class ApprovalStore {
  readonly #db: DatabaseSync;
  readonly #now: () => Date;
  readonly #ctx: ApprovalContext;

  constructor(db: DatabaseSync, now: () => Date, ctx: ApprovalContext) {
    this.#db = db;
    this.#now = now;
    this.#ctx = ctx;
    const columns = (db.prepare("PRAGMA table_info(approval_requests)").all() as { name: string }[]).map((c) => c.name);
    if (!columns.includes("eligible_ids")) db.exec("ALTER TABLE approval_requests ADD COLUMN eligible_ids TEXT");
    if (!columns.includes("policy")) db.exec("ALTER TABLE approval_requests ADD COLUMN policy TEXT");
  }

  /** True when a change in this organization needs the answers of other administrators. */
  required(spaceId: string): boolean {
    return approvalRequired(this.#ctx.policyOf(spaceId), this.#ctx.administratorsOf(spaceId).length);
  }

  /**
   * Makes a request, replacing an earlier one of the same kind and subject that is still open or approved. The proposer's
   * own answer is an approval when they are an eligible administrator. With no approval needed, nothing is made.
   */
  propose(spaceId: string, who: Proposer, kind: ApprovalKind, subject: string, digest: string, payload: Record<string, unknown>): ApprovalRequest | null {
    if (!this.required(spaceId)) return null;
    this.#expire();
    const policy = this.#ctx.policyOf(spaceId);
    const admins = this.#ctx.administratorsOf(spaceId);
    const at = this.#now();
    const id = randomBytes(9).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x");
    this.#db.prepare("UPDATE approval_requests SET status = 'superseded', decided_at = ? WHERE space_id = ? AND kind = ? AND subject = ? AND status IN ('pending', 'approved')").run(at.toISOString(), spaceId, kind, subject);
    this.#db
      .prepare("INSERT INTO approval_requests (id, space_id, kind, subject, digest, payload, proposer_id, proposer_label, eligible, eligible_ids, policy, created_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')")
      .run(id, spaceId, kind, subject, digest, JSON.stringify(payload), who.keyId, who.label, admins.length, JSON.stringify(admins.map((a) => a.id)), JSON.stringify(policy), at.toISOString(), new Date(at.getTime() + policy.delayHours * ONE_HOUR).toISOString());
    this.#ctx.log(spaceId, "request_created", who.label, { id, kind, subject, digest, eligible: admins.length });
    if (admins.some((a) => a.id === who.keyId)) {
      this.#record(id, who, "approve");
      this.#ctx.log(spaceId, "request_answered", who.label, { id, answer: "approve" });
    }
    return this.#evaluate(id);
  }

  /** An administrator's answer. It can be changed until the request is decided. Null when it cannot be given. */
  answer(spaceId: string, who: Proposer, requestId: string, answer: Answer): ApprovalRequest | null {
    this.#expire();
    const request = this.get(spaceId, requestId);
    if (!request || request.status !== "pending") return null;
    // Only those who were eligible when the request was made. A key made or revoked since changes nothing.
    if (!request.eligibleIds.includes(who.keyId)) return null;
    this.#record(requestId, who, answer);
    this.#ctx.log(spaceId, "request_answered", who.label, { id: requestId, answer });
    return this.#evaluate(requestId);
  }

  get(spaceId: string, requestId: string): ApprovalRequest | null {
    this.#expire();
    const row = this.#db.prepare("SELECT * FROM approval_requests WHERE id = ? AND space_id = ?").get(requestId, spaceId);
    return row ? this.#build(row) : null;
  }

  /** The latest request for a subject, whatever its state, except those replaced by a newer one. */
  latest(spaceId: string, kind: ApprovalKind, subject: string): ApprovalRequest | null {
    this.#expire();
    const row = this.#db.prepare("SELECT * FROM approval_requests WHERE space_id = ? AND kind = ? AND subject = ? AND status != 'superseded' ORDER BY created_at DESC, rowid DESC LIMIT 1").get(spaceId, kind, subject);
    return row ? this.#build(row) : null;
  }

  /** Requests still waiting for answers, newest first. */
  open(spaceId: string): ApprovalRequest[] {
    this.#expire();
    return this.#db.prepare("SELECT * FROM approval_requests WHERE space_id = ? AND status = 'pending' ORDER BY created_at DESC, rowid DESC").all(spaceId).map((r) => this.#build(r));
  }

  /** Requests decided in the last days, newest first. */
  recent(spaceId: string, limit = 20): ApprovalRequest[] {
    this.#expire();
    return this.#db.prepare("SELECT * FROM approval_requests WHERE space_id = ? AND status NOT IN ('pending', 'superseded') ORDER BY created_at DESC, rowid DESC LIMIT ?").all(spaceId, limit).map((r) => this.#build(r));
  }

  /** How many open requests the administrator has not answered. */
  waitingFor(spaceId: string, keyId: string): number {
    return this.open(spaceId).filter((r) => !r.answers.some((a) => a.keyId === keyId)).length;
  }

  /**
   * The approved, unused request that lets this action go ahead, or null. It must carry the digest of what is being
   * done now, and it holds for as long as the request was open.
   */
  permit(spaceId: string, kind: ApprovalKind, subject: string, digest: string): ApprovalRequest | null {
    const request = this.latest(spaceId, kind, subject);
    if (!request || request.status !== "approved" || request.digest !== digest) return null;
    return Date.parse(request.expiresAt) > this.#now().getTime() ? request : null;
  }

  /** Marks an approved request as used (a poll was published, a change applied). */
  consume(requestId: string): void {
    const row = this.#db.prepare("SELECT space_id, kind FROM approval_requests WHERE id = ? AND status = 'approved'").get(requestId);
    this.#db.prepare("UPDATE approval_requests SET status = 'applied' WHERE id = ? AND status = 'approved'").run(requestId);
    if (row) this.#ctx.log(String(row["space_id"]), "request_used", "system", { id: requestId, kind: String(row["kind"]) });
  }

  #record(requestId: string, who: Proposer, answer: Answer): void {
    this.#db
      .prepare("INSERT INTO approval_answers (request_id, key_id, label, answer, at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (request_id, key_id) DO UPDATE SET answer = excluded.answer, at = excluded.at, label = excluded.label")
      .run(requestId, who.keyId, who.label, answer, this.#now().toISOString());
  }

  /** Requests past their delay without a decision lapse. */
  #expire(): void {
    const due = this.#db.prepare("SELECT id, space_id FROM approval_requests WHERE status = 'pending' AND expires_at <= ?").all(this.#now().toISOString());
    for (const r of due) this.#ctx.log(String(r["space_id"]), "request_lapsed", "system", { id: String(r["id"]) });
    this.#db.prepare("UPDATE approval_requests SET status = 'lapsed', decided_at = expires_at WHERE status = 'pending' AND expires_at <= ?").run(this.#now().toISOString());
  }

  #evaluate(requestId: string): ApprovalRequest {
    const row = this.#db.prepare("SELECT * FROM approval_requests WHERE id = ?").get(requestId);
    if (!row) throw new Error("request vanished");
    const built = this.#build(row);
    if (built.status !== "pending") return built;
    const at = this.#now().toISOString();
    if (built.tally.outcome === "approved") {
      this.#db.prepare("UPDATE approval_requests SET status = 'approved', decided_at = ? WHERE id = ?").run(at, requestId);
      this.#ctx.log(built.spaceId, "request_approved", "system", { id: requestId, kind: built.kind });
      // Changes that need nothing more from anyone are applied now. A poll waits to be opened by an administrator.
      if (APPLIED_ON_APPROVAL.has(built.kind)) {
        const done = this.#ctx.apply({ ...built, status: "approved", decidedAt: at });
        this.#db.prepare("UPDATE approval_requests SET status = ? WHERE id = ?").run(done ? "applied" : "blocked", requestId);
        this.#ctx.log(built.spaceId, done ? "request_used" : "request_blocked", "system", { id: requestId, kind: built.kind });
      }
    } else if (built.tally.outcome === "rejected") {
      this.#db.prepare("UPDATE approval_requests SET status = 'rejected', decided_at = ? WHERE id = ?").run(at, requestId);
      this.#ctx.log(built.spaceId, "request_rejected", "system", { id: requestId, kind: built.kind });
    }
    return this.#build(this.#db.prepare("SELECT * FROM approval_requests WHERE id = ?").get(requestId) ?? row);
  }

  #build(r: Record<string, unknown>): ApprovalRequest {
    const id = String(r["id"]);
    const spaceId = String(r["space_id"]);
    const answers = this.#db
      .prepare("SELECT key_id, label, answer, at FROM approval_answers WHERE request_id = ? ORDER BY at, rowid")
      .all(id)
      .map((a) => ({ keyId: String(a["key_id"]), label: String(a["label"]), answer: String(a["answer"]) as Answer, at: String(a["at"]) }));
    const stored = r["policy"] === null || r["policy"] === undefined ? null : (JSON.parse(String(r["policy"])) as ApprovalPolicy);
    // A request made before the rule was kept with it follows the rule in force.
    const policy = stored ?? this.#ctx.policyOf(spaceId);
    const ids = r["eligible_ids"] === null || r["eligible_ids"] === undefined ? null : (JSON.parse(String(r["eligible_ids"])) as string[]);
    const counted = ids === null ? answers : answers.filter((a) => ids.includes(a.keyId));
    const expiresAt = String(r["expires_at"]);
    const tally = decide({
      policy,
      eligible: Number(r["eligible"]),
      approvals: counted.filter((a) => a.answer === "approve").length,
      rejections: counted.filter((a) => a.answer === "reject").length,
      abstentions: counted.filter((a) => a.answer === "abstain").length,
      expired: Date.parse(expiresAt) <= this.#now().getTime(),
    });
    return {
      id,
      spaceId,
      kind: String(r["kind"]) as ApprovalKind,
      subject: String(r["subject"]),
      digest: String(r["digest"]),
      payload: JSON.parse(String(r["payload"])) as Record<string, unknown>,
      proposerId: String(r["proposer_id"]),
      proposer: String(r["proposer_label"]),
      eligible: Number(r["eligible"]),
      // A request made before the keys were kept follows the administrators now in post.
      eligibleIds: ids ?? this.#ctx.administratorsOf(spaceId).map((a) => a.id),
      policy,
      createdAt: String(r["created_at"]),
      expiresAt,
      status: String(r["status"]) as RequestStatus,
      decidedAt: r["decided_at"] === null || r["decided_at"] === undefined ? null : String(r["decided_at"]),
      answers,
      tally,
    };
  }
}
