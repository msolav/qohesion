// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The test edition's storage and rules (ADR 0007): spaces, keys, polls, the roll, ballots, results and the ledger,
 * on one SQLite file. Ballots are stored WITHOUT encryption in this edition. Everything that touches a ballot goes
 * through this file so that the audited scheme replaces it in one place.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { defineForm, validateForm, type Form } from "@qohesion/engine";
import { MerkleLog, hashLeaf, receiptCode, toHex, normalizeReceiptCode, verifyInclusion } from "@qohesion/ledger";
import { addressFingerprint, applyEvent, checkAddress, freezeRoll, type MemberStatus } from "@qohesion/roll";
import { generateCountingKeys, keyMatches, open as openSealed, seal } from "./seal.js";
import { isColorId, isIconId } from "../option-style.js";
import { DEFAULT_THEME, isTheme, type Theme } from "../theme.js";
import { NO_RULES, closeReason, parseRules, ruleProblem, type CloseRules } from "../close-rules.js";
import { DEFAULT_TIME_ZONE, isTimeZone } from "../zoned.js";
import { accessTo, isAudience, isTiming, type Access, type PollStatus, type ResultsAudience, type ResultsTiming, type Viewer } from "../results-rules.js";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base32(bytes: Uint8Array, length: number): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      bits -= 5;
      out += CROCKFORD[(value >> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

const sha256hex = (text: string): string => createHash("sha256").update(text).digest("hex");

export type ThemeName = Theme;
export type Locale = "fr" | "en";
export type PollKind = "yes-no" | "choice";

export interface Session {
  readonly keyId: string;
  readonly spaceId: string;
  readonly label: string;
  readonly owner: boolean;
  readonly administrator: boolean;
}

export interface Space {
  readonly id: string;
  readonly name: string;
  readonly locale: Locale;
  readonly theme: ThemeName;
  /** The zone in which the dates of polls are typed and shown. */
  readonly timeZone: string;
}

export interface KeyInfo {
  readonly id: string;
  readonly label: string;
  readonly owner: boolean;
  readonly administrator: boolean;
  readonly createdAt: string;
  readonly revokedAt: string | null;
}

export interface PollOption {
  readonly id: string;
  /** Null for the three fixed options of a yes-no poll, whose labels come from the interface language. */
  readonly label: string | null;
  /** An icon id from option-style.ts, or null for the default mark. */
  readonly icon?: string | null;
  /** A colour id from option-style.ts, or null for the default. */
  readonly color?: string | null;
}

export interface Poll {
  readonly id: string;
  readonly spaceId: string;
  readonly title: string;
  readonly description: string;
  readonly kind: PollKind;
  readonly options: readonly PollOption[];
  readonly status: PollStatus;
  readonly timing: ResultsTiming;
  readonly audience: ResultsAudience;
  readonly theme: ThemeName;
  /** When the poll opens by itself, or null when administrators open it. */
  readonly opensAt: string | null;
  /** Members may vote again until the poll closes: their last ballot counts. Only with sealed ballots. */
  readonly allowChange: boolean;
  readonly rules: CloseRules;
  /** Ballots are sealed with the poll's public key and read only with the counting key. */
  readonly encrypted: boolean;
  /** False for a sealed poll that closed and still waits for its counting key. */
  readonly counted: boolean;
  readonly markFill: boolean;
  readonly createdAt: string;
  readonly openedAt: string | null;
  /** The deadline. Null only for a poll made before deadlines were required. */
  readonly closesAt: string | null;
  readonly closedAt: string | null;
  readonly rollCode: string | null;
  readonly rollCount: number | null;
}

export interface RollEntry {
  readonly id: number;
  readonly address: string;
  readonly status: MemberStatus;
  readonly late: boolean;
  readonly addedAt: string;
  readonly votedOn: string | null;
  /** The day a link was last sent by email, or null. */
  readonly invitedOn: string | null;
}

export interface OptionInput {
  readonly label: string;
  readonly icon: string | null;
  readonly color: string | null;
}

export interface PollInput {
  readonly title: string;
  readonly description: string;
  readonly kind: PollKind;
  /** The options of a "choice" poll, in order. Ignored for "yes-no". */
  readonly options: readonly OptionInput[];
  readonly timing: ResultsTiming;
  readonly audience: ResultsAudience;
  readonly theme: ThemeName;
  /** The opening instant (ISO), or null when administrators open it. */
  readonly opensAt: string | null;
  /** The deadline (ISO). */
  readonly closesAt: string;
  readonly rules: CloseRules;
  readonly allowChange: boolean;
  readonly encrypted: boolean;
  /** One setting for every option: the colours fill the circle of each mark, or draw the icon and the outline. */
  readonly markFill: boolean;
}

export type Problem = { readonly ok: false; readonly error: string };
export type Done<T> = { readonly ok: true; readonly value: T };
export type Result<T> = Done<T> | Problem;

const ok = <T>(value: T): Done<T> => ({ ok: true, value });
const problem = (error: string): Problem => ({ ok: false, error });

export interface Totals {
  readonly turnout: number;
  readonly counts: Readonly<Record<string, number>>;
}

export interface ResultsView {
  readonly status: PollStatus;
  /** The poll closed but its sealed ballots are not counted yet. */
  readonly pending: boolean;
  readonly access: Access;
  readonly turnout: number | null;
  readonly counts: Readonly<Record<string, number>> | null;
  readonly rollCount: number | null;
}

export interface LedgerView {
  readonly size: number;
  readonly root: string;
  readonly receipts: readonly string[];
}

export interface HistoryItem {
  readonly at: string;
  readonly actor: string;
  readonly action: string;
  readonly detail: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS spaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, locale TEXT NOT NULL, theme TEXT NOT NULL, time_zone TEXT NOT NULL DEFAULT 'America/Toronto', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS keys (
  id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, label TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE, owner INTEGER NOT NULL, administrator INTEGER NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, key_id TEXT NOT NULL REFERENCES keys(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT NOT NULL,
  kind TEXT NOT NULL, options TEXT NOT NULL, status TEXT NOT NULL, timing TEXT NOT NULL, audience TEXT NOT NULL, theme TEXT NOT NULL,
  close_after_hours INTEGER, opens_at TEXT, allow_change INTEGER NOT NULL DEFAULT 0, close_rules TEXT, created_at TEXT NOT NULL, opened_at TEXT, closes_at TEXT, closed_at TEXT, roll_code TEXT, roll_count INTEGER,
  encrypted INTEGER NOT NULL DEFAULT 0, public_key TEXT, counted INTEGER NOT NULL DEFAULT 1, mark_fill INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS roll (
  id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE, address TEXT NOT NULL,
  fingerprint TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, late INTEGER NOT NULL, added_at TEXT NOT NULL,
  voted_on TEXT, invited_on TEXT, UNIQUE (poll_id, fingerprint));
-- A ballot holds no reference to a voter, and the roll holds no reference to a ballot. Only the day of a vote is kept on the roll.
CREATE TABLE IF NOT EXISTS ballots (poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE, seq INTEGER NOT NULL, choice TEXT NOT NULL, entry TEXT NOT NULL, voter_tag TEXT, superseded INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (poll_id, seq));
CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
`;

type Row = Record<string, string | number | bigint | null | Uint8Array>;

export interface ServiceOptions {
  readonly secret: Uint8Array;
  readonly now?: () => Date;
}

const SESSION_DAYS = 14;
export const MAX_ROLL = 200;
export const MAX_OPTIONS = 12;

export class Service {
  readonly #db: DatabaseSync;
  readonly #secret: Uint8Array;
  readonly #now: () => Date;

  constructor(db: DatabaseSync, options: ServiceOptions) {
    if (options.secret.length < 32) throw new Error("The server secret must be at least 32 bytes");
    this.#db = db;
    this.#secret = options.secret;
    this.#now = options.now ?? (() => new Date());
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    db.exec(SCHEMA);
    this.#migrate();
  }

  /** Adds the columns that databases made by an earlier build lack. */
  #migrate(): void {
    const columns = (this.#db.prepare("PRAGMA table_info(polls)").all() as { name: string }[]).map((c) => c.name);
    const rollColumns = (this.#db.prepare("PRAGMA table_info(roll)").all() as { name: string }[]).map((c) => c.name);
    if (!rollColumns.includes("invited_on")) this.#db.exec("ALTER TABLE roll ADD COLUMN invited_on TEXT");
    const addIfMissing = (table: string, existing: string[], column: string, definition: string) => {
      if (!existing.includes(column)) this.#db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    };
    const names = (table: string) => (this.#db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
    addIfMissing("polls", columns, "opens_at", "TEXT");
    addIfMissing("polls", columns, "allow_change", "INTEGER NOT NULL DEFAULT 0");
    addIfMissing("polls", columns, "close_rules", "TEXT");
    addIfMissing("spaces", names("spaces"), "time_zone", "TEXT NOT NULL DEFAULT 'America/Toronto'");
    addIfMissing("ballots", names("ballots"), "voter_tag", "TEXT");
    addIfMissing("ballots", names("ballots"), "superseded", "INTEGER NOT NULL DEFAULT 0");
    if (!columns.includes("mark_fill")) this.#db.exec("ALTER TABLE polls ADD COLUMN mark_fill INTEGER NOT NULL DEFAULT 0");
    if (!columns.includes("encrypted")) this.#db.exec("ALTER TABLE polls ADD COLUMN encrypted INTEGER NOT NULL DEFAULT 0");
    if (!columns.includes("public_key")) this.#db.exec("ALTER TABLE polls ADD COLUMN public_key TEXT");
    if (!columns.includes("counted")) this.#db.exec("ALTER TABLE polls ADD COLUMN counted INTEGER NOT NULL DEFAULT 1");
  }

  static open(file: string, options: ServiceOptions): Service {
    return new Service(new DatabaseSync(file), options);
  }

  close(): void {
    this.#db.close();
  }

  #iso(): string {
    return this.#now().toISOString();
  }

  #id(length = 10): string {
    return base32(randomBytes(Math.ceil((length * 5) / 8) + 1), length).toLowerCase();
  }

  #one(sql: string, ...params: (string | number | null)[]): Row | undefined {
    return this.#db.prepare(sql).get(...params) as Row | undefined;
  }
  #all(sql: string, ...params: (string | number | null)[]): Row[] {
    return this.#db.prepare(sql).all(...params) as Row[];
  }
  #run(sql: string, ...params: (string | number | null)[]): void {
    this.#db.prepare(sql).run(...params);
  }

  #transaction<T>(work: () => T): T {
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const value = work();
      this.#db.exec("COMMIT");
      return value;
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
  }

  // ---- Spaces and keys ----

  /** Creates a space and its first key, which holds both roles. The key is returned once and never stored in clear. */
  createSpace(input: { name: string; locale: Locale; theme?: ThemeName; timeZone?: string }): Result<{ space: Space; key: string }> {
    const name = input.name.trim();
    if (name.length === 0) return problem("name_required");
    if (name.length > 80) return problem("name_too_long");
    const space: Space = { id: this.#id(), name, locale: input.locale, theme: input.theme ?? DEFAULT_THEME, timeZone: isTimeZone(input.timeZone) ? input.timeZone : DEFAULT_TIME_ZONE };
    const key = this.#newKeyValue();
    this.#transaction(() => {
      this.#run("INSERT INTO spaces (id, name, locale, theme, time_zone, created_at) VALUES (?, ?, ?, ?, ?, ?)", space.id, space.name, space.locale, space.theme, space.timeZone, this.#iso());
      this.#insertKey(space.id, "Owner", key, true, true);
    });
    return ok({ space, key });
  }

  #newKeyValue(): string {
    const text = base32(randomBytes(16), 24);
    return `QK-${text.slice(0, 6)}-${text.slice(6, 12)}-${text.slice(12, 18)}-${text.slice(18, 24)}`;
  }

  #insertKey(spaceId: string, label: string, key: string, owner: boolean, administrator: boolean): string {
    const id = this.#id();
    this.#run("INSERT INTO keys (id, space_id, label, hash, owner, administrator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", id, spaceId, label, sha256hex(normalizeKey(key)), owner ? 1 : 0, administrator ? 1 : 0, this.#iso());
    return id;
  }

  /** True once the installation has its organization. An installation holds one. */
  isSetUp(): boolean {
    return Number(this.#one("SELECT COUNT(*) AS n FROM spaces")?.["n"] ?? 0) > 0;
  }

  getSpace(spaceId: string): Space | null {
    const r = this.#one("SELECT * FROM spaces WHERE id = ?", spaceId);
    return r ? { id: String(r["id"]), name: String(r["name"]), locale: r["locale"] === "en" ? "en" : "fr", theme: isTheme(r["theme"]) ? r["theme"] : DEFAULT_THEME, timeZone: isTimeZone(r["time_zone"]) ? r["time_zone"] : DEFAULT_TIME_ZONE } : null;
  }

  updateSpace(session: Session, input: { name: string; locale: Locale; theme: ThemeName; timeZone: string }): Result<Space> {
    if (!session.owner) return problem("forbidden");
    const name = input.name.trim();
    if (name.length === 0) return problem("name_required");
    if (name.length > 80) return problem("name_too_long");
    if (!isTimeZone(input.timeZone)) return problem("invalid_time_zone");
    this.#run("UPDATE spaces SET name = ?, locale = ?, theme = ?, time_zone = ? WHERE id = ?", name, input.locale, input.theme, input.timeZone, session.spaceId);
    const space = this.getSpace(session.spaceId);
    return space ? ok(space) : problem("not_found");
  }

  listKeys(session: Session): KeyInfo[] {
    if (!session.owner) return [];
    return this.#all("SELECT * FROM keys WHERE space_id = ? ORDER BY created_at, id", session.spaceId).map((r) => ({
      id: String(r["id"]),
      label: String(r["label"]),
      owner: r["owner"] === 1,
      administrator: r["administrator"] === 1,
      createdAt: String(r["created_at"]),
      revokedAt: r["revoked_at"] === null ? null : String(r["revoked_at"]),
    }));
  }

  /** Creates another key for the space. An owner is needed. The key is returned once. */
  createKey(session: Session, input: { label: string; owner: boolean; administrator: boolean }): Result<{ key: string }> {
    if (!session.owner) return problem("forbidden");
    const label = input.label.trim();
    if (label.length === 0) return problem("label_required");
    if (label.length > 60) return problem("label_too_long");
    if (!input.owner && !input.administrator) return problem("role_required");
    const key = this.#newKeyValue();
    this.#insertKey(session.spaceId, label, key, input.owner, input.administrator);
    return ok({ key });
  }

  /** Revokes a key and ends its sessions. The last owner key cannot be revoked. */
  revokeKey(session: Session, keyId: string): Result<null> {
    if (!session.owner) return problem("forbidden");
    return this.#transaction(() => {
      const target = this.#one("SELECT * FROM keys WHERE id = ? AND space_id = ?", keyId, session.spaceId);
      if (!target) return problem("not_found");
      if (target["revoked_at"] !== null) return ok(null);
      if (target["owner"] === 1) {
        const owners = this.#one("SELECT COUNT(*) AS n FROM keys WHERE space_id = ? AND owner = 1 AND revoked_at IS NULL", session.spaceId);
        if (Number(owners?.["n"] ?? 0) <= 1) return problem("last_owner");
      }
      this.#run("UPDATE keys SET revoked_at = ? WHERE id = ?", this.#iso(), keyId);
      this.#run("DELETE FROM sessions WHERE key_id = ?", keyId);
      return ok(null);
    });
  }

  /** Deletes the space with everything in it. An owner is needed, and must repeat the space name. */
  deleteSpace(session: Session, confirmName: string): Result<null> {
    if (!session.owner) return problem("forbidden");
    const space = this.getSpace(session.spaceId);
    if (!space) return problem("not_found");
    if (confirmName.trim() !== space.name) return problem("name_mismatch");
    this.#run("DELETE FROM spaces WHERE id = ?", session.spaceId);
    return ok(null);
  }

  // ---- Sign-in ----

  /** Exchanges a key for a session token, or null when the key is unknown or revoked. */
  signIn(key: string): string | null {
    const row = this.#one("SELECT id FROM keys WHERE hash = ? AND revoked_at IS NULL", sha256hex(normalizeKey(key)));
    if (!row) return null;
    const token = randomBytes(32).toString("base64url");
    const expires = new Date(this.#now().getTime() + SESSION_DAYS * 86_400_000).toISOString();
    this.#run("DELETE FROM sessions WHERE expires_at < ?", this.#iso());
    this.#run("INSERT INTO sessions (hash, key_id, expires_at) VALUES (?, ?, ?)", sha256hex(token), String(row["id"]), expires);
    return token;
  }

  signOut(token: string): void {
    this.#run("DELETE FROM sessions WHERE hash = ?", sha256hex(token));
  }

  session(token: string | undefined): Session | null {
    if (!token) return null;
    const row = this.#one(
      `SELECT k.id, k.space_id, k.label, k.owner, k.administrator FROM sessions s JOIN keys k ON k.id = s.key_id
       WHERE s.hash = ? AND s.expires_at > ? AND k.revoked_at IS NULL`,
      sha256hex(token),
      this.#iso(),
    );
    if (!row) return null;
    return { keyId: String(row["id"]), spaceId: String(row["space_id"]), label: String(row["label"]), owner: row["owner"] === 1, administrator: row["administrator"] === 1 };
  }

  // ---- Polls ----

  #poll(r: Row): Poll {
    return {
      id: String(r["id"]),
      spaceId: String(r["space_id"]),
      title: String(r["title"]),
      description: String(r["description"]),
      kind: r["kind"] === "choice" ? "choice" : "yes-no",
      options: JSON.parse(String(r["options"])) as PollOption[],
      status: r["status"] === "open" ? "open" : r["status"] === "closed" ? "closed" : r["status"] === "scheduled" ? "scheduled" : "draft",
      timing: r["timing"] === "live" ? "live" : "close",
      audience: isAudience(r["audience"]) ? r["audience"] : "voters",
      theme: isTheme(r["theme"]) ? r["theme"] : DEFAULT_THEME,
      opensAt: r["opens_at"] === null ? null : String(r["opens_at"]),
      allowChange: r["allow_change"] === 1,
      rules: parseRules(r["close_rules"] === null ? null : String(r["close_rules"])),
      encrypted: r["encrypted"] === 1,
      counted: r["counted"] !== 0,
      markFill: r["mark_fill"] === 1,
      createdAt: String(r["created_at"]),
      openedAt: r["opened_at"] === null ? null : String(r["opened_at"]),
      closesAt: r["closes_at"] === null ? null : String(r["closes_at"]),
      closedAt: r["closed_at"] === null ? null : String(r["closed_at"]),
      rollCode: r["roll_code"] === null ? null : String(r["roll_code"]),
      rollCount: r["roll_count"] === null ? null : Number(r["roll_count"]),
    };
  }

  /**
   * Moves a poll along when its time has come: a scheduled poll opens at its opening date, an open poll closes at its
   * deadline. Called on every read, so no timer is needed.
   */
  #tick(pollId: string): void {
    const now = this.#iso();
    const due = this.#one("SELECT * FROM polls WHERE id = ? AND status = 'scheduled' AND opens_at IS NOT NULL AND opens_at <= ?", pollId, now);
    if (due) this.#transaction(() => this.#openNow(this.#poll(due), String(due["opens_at"]), "schedule"));
    // A sealed poll that closes by itself waits for its counting key (counted stays 0 until the key is given).
    this.#run("UPDATE polls SET status = 'closed', closed_at = closes_at, counted = CASE WHEN encrypted = 1 THEN 0 ELSE 1 END WHERE id = ? AND status = 'open' AND closes_at IS NOT NULL AND closes_at <= ?", pollId, now);
  }

  getPoll(pollId: string): Poll | null {
    this.#tick(pollId);
    const r = this.#one("SELECT * FROM polls WHERE id = ?", pollId);
    return r ? this.#poll(r) : null;
  }

  /** The polls of the administrator's space. Owners without the administrator role do not run polls and see none. */
  listPolls(session: Session): Poll[] {
    if (!session.administrator) return [];
    const ids = this.#all("SELECT id FROM polls WHERE space_id = ? ORDER BY created_at DESC, id", session.spaceId);
    return ids.map((r) => this.getPoll(String(r["id"]))).filter((p): p is Poll => p !== null);
  }

  /** A poll the session may run, or null. */
  pollFor(session: Session, pollId: string): Poll | null {
    if (!session.administrator) return null;
    const poll = this.getPoll(pollId);
    return poll && poll.spaceId === session.spaceId ? poll : null;
  }

  #validatePoll(input: PollInput): string | null {
    const title = input.title.trim();
    if (title.length === 0) return "title_required";
    if (title.length > 140) return "title_too_long";
    if (input.description.length > 2000) return "description_too_long";
    if (!isTiming(input.timing) || !isAudience(input.audience)) return "invalid_results";
    if (input.encrypted && input.timing === "live") return "encryption_needs_close";
    const closes = Date.parse(input.closesAt);
    if (Number.isNaN(closes)) return "closes_required";
    if (closes <= this.#now().getTime()) return "closes_past";
    if (input.opensAt !== null) {
      const opens = Date.parse(input.opensAt);
      if (Number.isNaN(opens) || opens >= closes) return "dates_order";
    }
    if (input.allowChange && !input.encrypted) return "change_needs_encryption";
    const rule = ruleProblem(input.rules, input.encrypted);
    if (rule) return rule;
    if (input.kind === "choice") {
      const labels = input.options.map((o) => o.label.trim()).filter((o) => o.length > 0);
      if (labels.length < 2) return "options_too_few";
      if (labels.length > MAX_OPTIONS) return "options_too_many";
      if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length) return "options_duplicate";
      if (labels.some((l) => l.length > 120)) return "option_too_long";
      if (input.options.some((o) => (o.icon !== null && !isIconId(o.icon)) || (o.color !== null && !isColorId(o.color)))) return "option_style_invalid";
    }
    return null;
  }

  #optionsOf(input: PollInput): PollOption[] {
    if (input.kind === "yes-no") return [{ id: "for", label: null }, { id: "against", label: null }, { id: "abstain", label: null }];
    return input.options
      .filter((o) => o.label.trim().length > 0)
      .map((o, i) => ({ id: `o${i + 1}`, label: o.label.trim(), icon: o.icon, color: o.color }));
  }

  createPoll(session: Session, input: PollInput): Result<Poll> {
    if (!session.administrator) return problem("forbidden");
    const error = this.#validatePoll(input);
    if (error) return problem(error);
    const id = this.#id();
    this.#transaction(() => {
      this.#run(
        `INSERT INTO polls (id, space_id, title, description, kind, options, status, timing, audience, theme, opens_at, closes_at, close_rules, allow_change, encrypted, counted, mark_fill, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, session.spaceId, input.title.trim(), input.description.trim(), input.kind, JSON.stringify(this.#optionsOf(input)), input.timing, input.audience, input.theme, input.opensAt, input.closesAt, JSON.stringify(input.rules), input.allowChange ? 1 : 0, input.encrypted ? 1 : 0, input.encrypted ? 0 : 1, input.markFill ? 1 : 0, this.#iso(),
      );
      this.#log(id, session, "created", "");
    });
    const poll = this.getPoll(id);
    return poll ? ok(poll) : problem("not_found");
  }

  /** Changes a draft. Results settings and options are locked once the poll opens. */
  updatePoll(session: Session, pollId: string, input: PollInput): Result<Poll> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status !== "draft") return problem("locked");
    const error = this.#validatePoll(input);
    if (error) return problem(error);
    this.#run(
      "UPDATE polls SET title = ?, description = ?, kind = ?, options = ?, timing = ?, audience = ?, theme = ?, opens_at = ?, closes_at = ?, close_rules = ?, allow_change = ?, encrypted = ?, counted = ?, mark_fill = ? WHERE id = ?",
      input.title.trim(), input.description.trim(), input.kind, JSON.stringify(this.#optionsOf(input)), input.timing, input.audience, input.theme, input.opensAt, input.closesAt, JSON.stringify(input.rules), input.allowChange ? 1 : 0, input.encrypted ? 1 : 0, input.encrypted ? 0 : 1, input.markFill ? 1 : 0, pollId,
    );
    const next = this.getPoll(pollId);
    return next ? ok(next) : problem("not_found");
  }

  deletePoll(session: Session, pollId: string): Result<null> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status !== "draft") return problem("locked");
    this.#run("DELETE FROM polls WHERE id = ?", pollId);
    return ok(null);
  }

  #log(pollId: string, who: Session | string, action: string, detail: string): void {
    this.#run("INSERT INTO history (poll_id, at, actor, action, detail) VALUES (?, ?, ?, ?, ?)", pollId, this.#iso(), typeof who === "string" ? who : who.label, action, detail);
  }

  history(session: Session, pollId: string): HistoryItem[] {
    if (!this.pollFor(session, pollId)) return [];
    return this.#all("SELECT at, actor, action, detail FROM history WHERE poll_id = ? ORDER BY id", pollId).map((r) => ({ at: String(r["at"]), actor: String(r["actor"]), action: String(r["action"]), detail: String(r["detail"]) }));
  }

  // ---- Roll ----

  #fingerprint(address: string): string {
    return addressFingerprint(address, this.#secret);
  }

  /** The personal link token of one entry. Derived from the server secret, so it can be shown again without being stored. */
  #token(pollId: string, fingerprint: string): string {
    return base32(createHmac("sha256", this.#secret).update(`voter\n${pollId}\n${fingerprint}`).digest(), 24);
  }

  /** Adds addresses typed or pasted by an administrator. Returns what was added and what was left out, and why. */
  addToRoll(session: Session, pollId: string, text: string): Result<{ added: number; duplicates: number; rejected: readonly { line: string; reason: "invalid" | "disposable" }[] }> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status === "closed") return problem("locked");
    const lines = text.split(/[\n\r,;]+/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return problem("nothing_entered");
    if (lines.length > MAX_ROLL) return problem("too_many_addresses");
    let added = 0;
    let duplicates = 0;
    const rejected: { line: string; reason: "invalid" | "disposable" }[] = [];
    this.#transaction(() => {
      const count = Number(this.#one("SELECT COUNT(*) AS n FROM roll WHERE poll_id = ?", pollId)?.["n"] ?? 0);
      let room = MAX_ROLL - count;
      for (const line of lines) {
        const check = checkAddress(line);
        if (!check.ok || !check.normalized) {
          rejected.push({ line, reason: check.issue?.code === "disposable" ? "disposable" : "invalid" });
          continue;
        }
        const fingerprint = this.#fingerprint(check.normalized);
        if (this.#one("SELECT 1 AS x FROM roll WHERE poll_id = ? AND fingerprint = ?", pollId, fingerprint)) {
          duplicates++;
          continue;
        }
        if (room <= 0) {
          rejected.push({ line, reason: "invalid" });
          continue;
        }
        room--;
        this.#run(
          "INSERT INTO roll (poll_id, address, fingerprint, token_hash, status, late, added_at) VALUES (?, ?, ?, ?, 'listed', ?, ?)",
          pollId, check.normalized, fingerprint, sha256hex(this.#token(pollId, fingerprint)), poll.status === "open" ? 1 : 0, this.#iso(),
        );
        added++;
      }
      if (added > 0) this.#log(pollId, session, poll.status === "open" ? "roll_added_late" : "roll_added", String(added));
    });
    return ok({ added, duplicates, rejected });
  }

  /** Removes an address from a draft's roll. After opening, the roll only grows. */
  removeFromRoll(session: Session, pollId: string, entryId: number): Result<null> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status !== "draft") return problem("locked");
    this.#run("DELETE FROM roll WHERE id = ? AND poll_id = ?", entryId, pollId);
    return ok(null);
  }

  roll(session: Session, pollId: string): RollEntry[] {
    if (!this.pollFor(session, pollId)) return [];
    return this.#all("SELECT * FROM roll WHERE poll_id = ? ORDER BY id", pollId).map((r) => ({
      id: Number(r["id"]),
      address: String(r["address"]),
      status: String(r["status"]) as MemberStatus,
      late: r["late"] === 1,
      addedAt: String(r["added_at"]),
      votedOn: r["voted_on"] === null ? null : String(r["voted_on"]),
      invitedOn: r["invited_on"] === null ? null : String(r["invited_on"]),
    }));
  }

  /** Personal links for the roll. Test edition: the administrator copies them, since nothing is sent by email. */
  voterTokens(session: Session, pollId: string): ReadonlyMap<number, string> {
    if (!this.pollFor(session, pollId)) return new Map();
    const map = new Map<number, string>();
    for (const r of this.#all("SELECT id, fingerprint FROM roll WHERE poll_id = ? ORDER BY id", pollId)) map.set(Number(r["id"]), this.#token(pollId, String(r["fingerprint"])));
    return map;
  }

  /**
   * The entries a poll's links can be sent to by email: those that have not voted, and (unless `all`) have not been
   * sent a link yet, or only the entry named. Each comes with its personal token.
   */
  invitees(session: Session, pollId: string, which: "new" | "all" | number): { id: number; address: string; token: string }[] {
    const poll = this.pollFor(session, pollId);
    if (!poll || poll.status !== "open") return [];
    return this.#all("SELECT id, address, fingerprint, status, invited_on FROM roll WHERE poll_id = ? ORDER BY id", pollId)
      .filter((r) => String(r["status"]) !== "voted")
      .filter((r) => (typeof which === "number" ? Number(r["id"]) === which : which === "all" ? true : r["invited_on"] === null))
      .map((r) => ({ id: Number(r["id"]), address: String(r["address"]), token: this.#token(pollId, String(r["fingerprint"])) }));
  }

  /** Records that links were sent: the day on each entry, and one line in the history (a count, no addresses). */
  markInvited(session: Session, pollId: string, ids: readonly number[]): void {
    if (ids.length === 0 || !this.pollFor(session, pollId)) return;
    const day = this.#iso().slice(0, 10);
    this.#transaction(() => {
      for (const id of ids) this.#run("UPDATE roll SET invited_on = ? WHERE id = ? AND poll_id = ?", day, id, pollId);
      this.#log(pollId, session, "links_sent", String(ids.length));
    });
  }

  // ---- Opening and closing ----

  /** Freezes the roll and opens the poll. Used by an administrator opening it and by a scheduled opening. */
  #openNow(poll: Poll, at: string, who: Session | string): Result<null> {
    const fingerprints = this.#all("SELECT fingerprint FROM roll WHERE poll_id = ?", poll.id).map((r) => String(r["fingerprint"]));
    if (fingerprints.length === 0) return problem("roll_empty");
    const frozen = freezeRoll(fingerprints);
    this.#run("UPDATE polls SET status = 'open', opened_at = ?, roll_code = ?, roll_count = ? WHERE id = ?", at, frozen.code, frozen.count, poll.id);
    this.#log(poll.id, who, "opened", `${frozen.count} · ${frozen.code}${poll.encrypted ? " · sealed" : ""}`);
    return ok(null);
  }

  /** Opens a poll now. For a sealed poll that was not scheduled, the counting key is returned here, once, and kept nowhere. */
  openPoll(session: Session, pollId: string): Result<{ poll: Poll; countingKey: string | null }> {
    let countingKey: string | null = null;
    const result = this.#transaction((): Result<null> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      if (poll.status !== "draft" && poll.status !== "scheduled") return problem("locked");
      if (poll.closesAt !== null && Date.parse(poll.closesAt) <= this.#now().getTime()) return problem("closes_past");
      if (poll.encrypted && poll.status === "draft") {
        const keys = generateCountingKeys();
        countingKey = keys.countingKey;
        this.#run("UPDATE polls SET public_key = ? WHERE id = ?", keys.publicKey, pollId);
      }
      return this.#openNow(poll, this.#iso(), session);
    });
    if (!result.ok) return result;
    const poll = this.getPoll(pollId);
    return poll ? ok({ poll, countingKey }) : problem("not_found");
  }

  /**
   * Plans the opening for the date chosen. A sealed poll gets its key pair now, since nobody will be there at the moment
   * of opening to be shown the counting key: it is returned here, once.
   */
  schedulePoll(session: Session, pollId: string): Result<{ poll: Poll; countingKey: string | null }> {
    let countingKey: string | null = null;
    const result = this.#transaction((): Result<null> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      if (poll.status !== "draft") return problem("locked");
      if (poll.opensAt === null || Date.parse(poll.opensAt) <= this.#now().getTime()) return problem("opens_past");
      if (poll.closesAt === null || Date.parse(poll.closesAt) <= Date.parse(poll.opensAt)) return problem("dates_order");
      if (Number(this.#one("SELECT COUNT(*) AS n FROM roll WHERE poll_id = ?", pollId)?.["n"] ?? 0) === 0) return problem("roll_empty");
      let publicKey: string | null = null;
      if (poll.encrypted) {
        const keys = generateCountingKeys();
        publicKey = keys.publicKey;
        countingKey = keys.countingKey;
      }
      this.#run("UPDATE polls SET status = 'scheduled', public_key = ? WHERE id = ?", publicKey, pollId);
      this.#log(pollId, session, "scheduled", poll.opensAt);
      return ok(null);
    });
    if (!result.ok) return result;
    const poll = this.getPoll(pollId);
    return poll ? ok({ poll, countingKey }) : problem("not_found");
  }

  /** Takes a poll back from scheduled to draft. The counting key given at scheduling stops being valid. */
  unschedulePoll(session: Session, pollId: string): Result<Poll> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status !== "scheduled") return problem("locked");
    this.#run("UPDATE polls SET status = 'draft', public_key = NULL WHERE id = ?", pollId);
    this.#log(pollId, session, "unscheduled", "");
    const next = this.getPoll(pollId);
    return next ? ok(next) : problem("not_found");
  }

  /** Closes an open poll. A sealed poll needs its counting key, and stays open if the key is wrong. */
  closePoll(session: Session, pollId: string, countingKey?: string): Result<Poll> {
    return this.#transaction((): Result<Poll> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      if (poll.status !== "open") return problem("locked");
      if (poll.encrypted) {
        const counted = this.#count(poll, countingKey ?? "");
        if (!counted.ok) return counted;
      }
      this.#run("UPDATE polls SET status = 'closed', closed_at = ? WHERE id = ?", this.#iso(), pollId);
      this.#log(pollId, session, "closed", poll.encrypted ? "counted" : "");
      const next = this.getPoll(pollId);
      return next ? ok(next) : problem("not_found");
    });
  }

  /** Counts the sealed ballots of a poll that closed by itself and waits for its key. */
  countPoll(session: Session, pollId: string, countingKey: string): Result<Poll> {
    return this.#transaction((): Result<Poll> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      if (poll.status !== "closed" || !poll.encrypted || poll.counted) return problem("locked");
      const counted = this.#count(poll, countingKey);
      if (!counted.ok) return counted;
      this.#log(pollId, session, "counted", "");
      const next = this.getPoll(pollId);
      return next ? ok(next) : problem("not_found");
    });
  }

  /**
   * Reads every sealed ballot with the counting key, in memory, and records the choices. All or nothing: a wrong key
   * or a ballot that does not open changes nothing. The ledger entries stay as they were, sealed.
   */
  #count(poll: Poll, countingKey: string): Result<null> {
    const row = this.#one("SELECT public_key FROM polls WHERE id = ?", poll.id);
    if (!row || typeof row["public_key"] !== "string" || !keyMatches(countingKey, row["public_key"])) return problem("wrong_counting_key");
    const valid = new Set(poll.options.map((o) => o.id));
    const updates: { seq: number; choice: string; superseded: boolean }[] = [];
    const lastOf = new Map<string, number>();
    const rows = this.#all("SELECT seq, entry, voter_tag FROM ballots WHERE poll_id = ? ORDER BY seq", poll.id);
    // Where members could change their vote, only each member's last ballot counts; the earlier ones stay in the ledger.
    for (const r of rows) if (r["voter_tag"] !== null) lastOf.set(String(r["voter_tag"]), Number(r["seq"]));
    for (const r of rows) {
      const entry = JSON.parse(String(r["entry"])) as { sealed?: string };
      const choice = entry.sealed ? openSealed(countingKey, entry.sealed) : null;
      if (choice === null || !valid.has(choice)) return problem("wrong_counting_key");
      const tag = r["voter_tag"] === null ? null : String(r["voter_tag"]);
      updates.push({ seq: Number(r["seq"]), choice, superseded: tag !== null && lastOf.get(tag) !== Number(r["seq"]) });
    }
    for (const u of updates) this.#run("UPDATE ballots SET choice = ?, superseded = ? WHERE poll_id = ? AND seq = ?", u.choice, u.superseded ? 1 : 0, poll.id, u.seq);
    this.#run("UPDATE polls SET counted = 1 WHERE id = ?", poll.id);
    return ok(null);
  }

  // ---- Voting ----

  /** The poll and the status of the entry behind a personal link, or null for an unknown link. */
  byToken(token: string): { poll: Poll; status: MemberStatus } | null {
    const r = this.#one("SELECT poll_id, status FROM roll WHERE token_hash = ?", sha256hex(normalizeToken(token)));
    if (!r) return null;
    const poll = this.getPoll(String(r["poll_id"]));
    return poll ? { poll, status: String(r["status"]) as MemberStatus } : null;
  }

  /** The poll as a form of the engine, so that an answer is checked the same way as every other answer. */
  static form(poll: Poll): Form {
    return defineForm({
      id: poll.id,
      title: { en: poll.title },
      steps: [
        {
          id: "q1",
          title: { en: poll.title },
          questions: [{ id: "choice", type: "single", required: true, label: { en: poll.title }, options: poll.options.map((o) => ({ id: o.id, label: { en: o.label ?? o.id } })) }],
        },
      ],
    });
  }

  castBallot(token: string, choice: string | undefined): Result<{ receipt: string }> {
    return this.#transaction((): Result<{ receipt: string }> => {
      const link = this.byToken(token);
      if (!link) return problem("unknown_link");
      const { poll } = link;
      if (poll.status !== "open") return problem(poll.status === "closed" ? "closed" : "not_open");
      const checked = validateForm(Service.form(poll), choice === undefined ? {} : { choice });
      if (!checked.ok || choice === undefined) return problem(checked.errors["choice"]?.[0]?.code ?? "invalid_type");

      // A personal link is the member's proof of the address, so opening it registers and confirms the entry (one-step informal poll).
      const row = this.#one("SELECT id, status, fingerprint FROM roll WHERE token_hash = ?", sha256hex(normalizeToken(token)));
      if (!row) return problem("unknown_link");
      let status = String(row["status"]) as MemberStatus;
      // Where the poll allows it, a member who has voted may vote again: the last ballot is the one that counts.
      if (!(poll.allowChange && status === "voted")) {
        for (const event of ["request", "confirm", "cast"] as const) {
          const step = applyEvent(status, event, "voting", { lateRegistration: true });
          if (!step.ok) return problem(status === "voted" ? "already_voted" : "not_allowed");
          status = step.status;
        }
      }
      this.#run("UPDATE roll SET status = ?, voted_on = ? WHERE id = ?", status, this.#iso().slice(0, 10), Number(row["id"]));

      const seq = Number(this.#one("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?", poll.id)?.["n"] ?? 0);
      // A sealed ballot is encrypted before it is stored: the table keeps no readable choice until the count.
      const publicKey = poll.encrypted ? String(this.#one("SELECT public_key FROM polls WHERE id = ?", poll.id)?.["public_key"] ?? "") : "";
      const entry = poll.encrypted
        ? JSON.stringify({ v: 1, poll: poll.id, seq, sealed: seal(publicKey, choice) })
        : JSON.stringify({ v: 1, poll: poll.id, seq, choice, nonce: randomBytes(12).toString("base64url") });
      // Only a poll that lets members change their vote ties a ballot to a pseudonym of its voter, so that the count can keep
      // the last one. The pseudonym shows who voted, never what, because such a poll is always sealed.
      const tag = poll.allowChange ? base32(createHmac("sha256", this.#secret).update(`tag\n${poll.id}\n${String(row["fingerprint"])}`).digest(), 26) : null;
      this.#run("INSERT INTO ballots (poll_id, seq, choice, entry, voter_tag) VALUES (?, ?, ?, ?, ?)", poll.id, seq, poll.encrypted ? "" : choice, entry, tag);
      this.#closeIfRuleHolds(poll, "automatic");
      return ok({ receipt: receiptCode(toHex(hashLeaf(new TextEncoder().encode(entry)))) });
    });
  }

  /** Closes the poll when one of its closing rules holds after a ballot. */
  #closeIfRuleHolds(poll: Poll, who: string): void {
    const r = poll.rules;
    if (r.afterVotes === null && r.turnoutPercent === null && r.threshold === null) return;
    const totals = this.#totals(poll);
    const rollSize = Number(this.#one("SELECT COUNT(*) AS n FROM roll WHERE poll_id = ?", poll.id)?.["n"] ?? 0);
    const reason = closeReason(r, { rollSize, voters: totals.turnout, counts: poll.encrypted ? null : totals.counts });
    if (!reason) return;
    this.#run("UPDATE polls SET status = 'closed', closed_at = ?, counted = ? WHERE id = ?", this.#iso(), poll.encrypted ? 0 : 1, poll.id);
    this.#log(poll.id, who, "closed_auto", reason);
  }

  // ---- Results ----

  #totals(poll: Poll): Totals {
    const counts: Record<string, number> = {};
    for (const o of poll.options) counts[o.id] = 0;
    // Turnout is the number of members who voted: with changes allowed, several ballots can belong to one member.
    const turnout = poll.allowChange
      ? Number(this.#one("SELECT COUNT(DISTINCT voter_tag) AS n FROM ballots WHERE poll_id = ?", poll.id)?.["n"] ?? 0)
      : Number(this.#one("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?", poll.id)?.["n"] ?? 0);
    for (const r of this.#all("SELECT choice, COUNT(*) AS n FROM ballots WHERE poll_id = ? AND superseded = 0 GROUP BY choice", poll.id)) {
      // Sealed ballots have no readable choice until they are counted.
      if (String(r["choice"]) !== "") counts[String(r["choice"])] = Number(r["n"]);
    }
    return { turnout, counts };
  }

  /** What a viewer may see of a poll's results, and nothing more. Every screen and the JSON address go through here. */
  resultsFor(pollId: string, viewer: Viewer): ResultsView | null {
    const poll = this.getPoll(pollId);
    if (!poll || poll.status === "draft" || poll.status === "scheduled") return null;
    const pending = poll.status === "closed" && !poll.counted;
    const allowed = accessTo(poll, viewer);
    const access = pending ? { turnout: allowed.turnout, totals: false } : allowed;
    const totals = access.turnout || access.totals ? this.#totals(poll) : null;
    return {
      status: poll.status,
      pending,
      access,
      turnout: access.turnout && totals ? totals.turnout : null,
      counts: access.totals && totals ? totals.counts : null,
      rollCount: poll.rollCount,
    };
  }

  /** Who a member is, for the results page they opened with their link. */
  viewerOfToken(token: string): { pollId: string; viewer: Viewer } | null {
    const link = this.byToken(token);
    return link ? { pollId: link.poll.id, viewer: "voter" } : null;
  }

  // ---- Ledger ----

  #log_(pollId: string): MerkleLog {
    const log = new MerkleLog();
    for (const r of this.#all("SELECT entry FROM ballots WHERE poll_id = ? ORDER BY seq", pollId)) log.append(new TextEncoder().encode(String(r["entry"])));
    return log;
  }

  /** The ledger of a closed poll: size, root and the receipt codes. Open polls show nothing, since the order would reveal the pace. */
  ledger(pollId: string): LedgerView | null {
    const poll = this.getPoll(pollId);
    if (!poll || poll.status !== "closed") return null;
    const log = this.#log_(pollId);
    return { size: log.size, root: log.root(), receipts: log.leafHashes().map(receiptCode) };
  }

  /** Checks a receipt code against the closed ledger and returns the position and proof, or null. */
  checkReceipt(pollId: string, input: string): { position: number; size: number; root: string; leaf: string; proof: readonly string[]; valid: boolean } | null {
    const poll = this.getPoll(pollId);
    const code = normalizeReceiptCode(input);
    if (!poll || poll.status !== "closed" || !code) return null;
    const log = this.#log_(pollId);
    const position = log.leafHashes().findIndex((h) => receiptCode(h) === code);
    if (position === -1) return null;
    const leaf = log.leafHash(position);
    const proof = log.inclusionProof(position);
    const valid = verifyInclusion({ leafHash: leaf, index: position, size: log.size, path: proof, root: log.root() });
    return { position, size: log.size, root: log.root(), leaf, proof, valid };
  }
}

export function normalizeKey(key: string): string {
  return key.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/^QK/, "");
}

export function normalizeToken(token: string): string {
  return token.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
