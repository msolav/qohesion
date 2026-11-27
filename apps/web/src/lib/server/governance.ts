// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DatabaseSync } from "node:sqlite";
import { MerkleLog, hashLeaf, toHex } from "@qohesion/ledger";

/**
 * The record of an organization's governance (ADR 0009 section 10): every request, answer and applied change, appended in
 * order. Each entry names the hash of the one before it, and the whole record has a Merkle root. An administrator who keeps a
 * checkpoint (size and root) can tell later whether the record was cut or rewritten.
 */

export const GOVERNANCE_SCHEMA = `
CREATE TABLE IF NOT EXISTS governance_log (
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, seq INTEGER NOT NULL, at TEXT NOT NULL,
  kind TEXT NOT NULL, actor TEXT NOT NULL, entry TEXT NOT NULL, PRIMARY KEY (space_id, seq));
`;

export interface GovernanceEntry {
  readonly seq: number;
  readonly at: string;
  readonly kind: string;
  readonly actor: string;
  readonly detail: Readonly<Record<string, unknown>>;
}

export interface GovernanceRecord {
  readonly size: number;
  readonly root: string;
  /** False when an entry does not follow from the one before it. */
  readonly intact: boolean;
  /** The sequence number of the first entry that does not follow, when the chain is broken. */
  readonly brokenAt: number | null;
  /** The three lines to keep: kept now, compared later. */
  readonly checkpoint: string;
  /** Newest first. */
  readonly entries: readonly GovernanceEntry[];
}

const encoder = new TextEncoder();
const GENESIS = "0".repeat(64);

export class GovernanceLog {
  readonly #db: DatabaseSync;
  readonly #now: () => Date;

  constructor(db: DatabaseSync, now: () => Date) {
    this.#db = db;
    this.#now = now;
  }

  append(spaceId: string, kind: string, actor: string, detail: Record<string, unknown> = {}): void {
    const last = this.#db.prepare("SELECT seq, entry FROM governance_log WHERE space_id = ? ORDER BY seq DESC LIMIT 1").get(spaceId);
    const seq = last ? Number(last["seq"]) + 1 : 0;
    const prev = last ? toHex(hashLeaf(encoder.encode(String(last["entry"])))) : GENESIS;
    const at = this.#now().toISOString();
    const entry = JSON.stringify({ v: 1, space: spaceId, seq, at, kind, actor, detail, prev });
    this.#db.prepare("INSERT INTO governance_log (space_id, seq, at, kind, actor, entry) VALUES (?, ?, ?, ?, ?, ?)").run(spaceId, seq, at, kind, actor, entry);
  }

  /** The record as it stands, with its chain checked from the first entry to the last. */
  record(spaceId: string, limit = 200): GovernanceRecord {
    const rows = this.#db.prepare("SELECT seq, entry FROM governance_log WHERE space_id = ? ORDER BY seq").all(spaceId);
    const log = new MerkleLog();
    let prev = GENESIS;
    let brokenAt: number | null = null;
    const entries: GovernanceEntry[] = [];
    rows.forEach((row, index) => {
      const text = String(row["entry"]);
      const parsed = JSON.parse(text) as { seq: number; at: string; kind: string; actor: string; detail: Record<string, unknown>; prev: string };
      if (brokenAt === null && (parsed.prev !== prev || parsed.seq !== index || Number(row["seq"]) !== index)) brokenAt = Number(row["seq"]);
      const bytes = encoder.encode(text);
      log.append(bytes);
      prev = toHex(hashLeaf(bytes));
      entries.push({ seq: parsed.seq, at: parsed.at, kind: parsed.kind, actor: parsed.actor, detail: parsed.detail });
    });
    const root = log.root();
    return {
      size: log.size,
      root,
      intact: brokenAt === null,
      brokenAt,
      checkpoint: `qohesion-record-v1\nspace ${spaceId}\nsize ${log.size}\nroot ${root}\n`,
      entries: entries.reverse().slice(0, limit),
    };
  }

  /** Every entry as stored, in order, for a download that can be checked without this server. */
  download(spaceId: string): { checkpoint: string; entries: { seq: number; entry: string }[] } {
    const record = this.record(spaceId, 0);
    const entries = this.#db.prepare("SELECT seq, entry FROM governance_log WHERE space_id = ? ORDER BY seq").all(spaceId).map((r) => ({ seq: Number(r["seq"]), entry: String(r["entry"]) }));
    return { checkpoint: record.checkpoint, entries };
  }
}
