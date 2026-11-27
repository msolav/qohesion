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
import { addressFingerprint, applyEvent, checkAddress, freezeRoll, parseAddress, type MemberStatus } from "@qohesion/roll";
import { generateCountingKeyBytes, generateCountingKeys, keyFromInput, keyMatches, open as openSealed, seal, shareSecret, formatCountingKey } from "./seal.js";
import { isColorId, isIconId } from "../option-style.js";
import { DEFAULT_THEME, isTheme, type Theme } from "../theme.js";
import { isAutoReminder, mayWrite, reminderDue, writeAgainAt, type AutoReminder } from "../auto-reminder.js";
import { NO_TRANSLATIONS, cleanLanguages, missingTexts, type Translations } from "../poll-i18n.js";
import { NO_RULES, closeReason, parseRules, ruleProblem, type CloseRules } from "../close-rules.js";
import { DEFAULT_TIME_ZONE, isTimeZone } from "../zoned.js";
import { NO_APPROVAL, isDelay, isMeaning, isRule, type Answer, type ApprovalPolicy } from "../approval.js";
import { APPROVAL_SCHEMA, ApprovalStore, type ApprovalKind, type ApprovalRequest } from "./approvals.js";
import { accessTo, isAnonymity, isAudience, isTiming, type Access, type Anonymity, type PollStatus, type ResultsAudience, type ResultsTiming, type Viewer } from "../results-rules.js";

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

/** How a poll was approved, kept with the poll and shown to voters (ADR 0009). */
export interface PollApproval {
  readonly rule: "none" | "majority" | "all";
  readonly approvals: number;
  readonly eligible: number;
  readonly at: string;
  /** The digest of what was approved. */
  readonly digest: string;
}

export type ApprovalState = "not_needed" | "none" | "pending" | "approved" | "rejected" | "lapsed" | "stale";

export interface PollApprovalState {
  /** Whether publishing this poll needs the approval of other administrators. */
  readonly required: boolean;
  readonly state: ApprovalState;
  readonly request: ApprovalRequest | null;
  /** What changed since the request was made, when the state is "stale". */
  readonly changes: readonly string[];
  readonly digest: string;
}

/** Actions that wait for a permit once the organization asks for approval. Doing the action uses the permit up. */
export type ActionKind = "open_scheduled" | "close_poll" | "cancel_poll" | "add_roll" | "add_key" | "revoke_key" | "delete_space";

export interface ActionApprovalState {
  readonly required: boolean;
  readonly state: ApprovalState;
  readonly request: ApprovalRequest | null;
}

/** What a roll entry held before a message was held for it: to put back if the message does not go. */
export interface InviteHold {
  readonly id: number;
  readonly invitedOn: string | null;
  readonly invitedAt: string | null;
  readonly count: number;
  readonly firstInvitedOn: string | null;
}

export type SpaceUpdate = Space & { readonly request: ApprovalRequest | null };

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
  /** The name of the organization when the poll was published, and for a draft its current name. */
  readonly organization: string;
  /** Names the poll in lists and emails. */
  readonly title: string;
  /** The question members answer, shown above the choices. */
  readonly question: string;
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
  readonly anonymity: Anonymity;
  /** Reminders the poll sends by itself to those who have not voted. */
  readonly autoReminder: AutoReminder;
  /** After the count, the ballot list (and the counting key of a sealed poll) is published so that anyone can recount. */
  readonly publishCount: boolean;
  /** 1 when one counting key opens the ballots; k when k administrators must act together (a key cut in shares). */
  readonly keyThreshold: number;
  /** Once the first ballot is cast, the poll can no longer be cancelled. */
  readonly lockCancel: boolean;
  /** The ballot is shown one page at a time (introduction, rules, question, check) rather than all on one page. */
  readonly paged: boolean;
  /** Administrators may keep adding participants after the poll opens (they are marked as late). Stated to voters. */
  readonly lateRoll: boolean;
  /** How the poll was approved when it was published. Null for a poll published before approvals existed. */
  readonly approval: PollApproval | null;
  /** Set when the poll was cancelled: when, by which key, and how many ballots had been cast. */
  readonly cancelled: { readonly by: string; readonly ballots: number } | null;
  /** The content in the languages offered. The columns title, description and options hold the default language. */
  readonly translations: Translations;
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
  /** The moment of the latest link, for the 24 hour gap. */
  readonly invitedAt: string | null;
  /** The day of the first link, and how many times a link was sent (the first one included). */
  readonly firstInvitedOn: string | null;
  readonly invites: number;
}

export interface OptionInput {
  readonly label: string;
  readonly icon: string | null;
  readonly color: string | null;
}

export interface PollInput {
  readonly title: string;
  readonly question: string;
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
  readonly anonymity: Anonymity;
  readonly autoReminder: AutoReminder;
  readonly publishCount: boolean;
  readonly keyThreshold: number;
  readonly lockCancel: boolean;
  readonly paged: boolean;
  readonly lateRoll: boolean;
  /** The administrator confirmed permission to contact the participants, which automatic reminders need. */
  readonly reminderPermission: boolean;
  /** The other languages (and the default again). With one language or none, the poll is written in `title` alone. */
  readonly translations: Translations;
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
  /** For a named poll, who gave which answer, to those who see the totals; null otherwise. */
  readonly answers: readonly { readonly who: string; readonly choice: string }[] | null;
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
CREATE TABLE IF NOT EXISTS spaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, locale TEXT NOT NULL, theme TEXT NOT NULL, time_zone TEXT NOT NULL DEFAULT 'America/Toronto', approval_rule TEXT NOT NULL DEFAULT 'none', approval_abstention TEXT NOT NULL DEFAULT 'neutral', approval_delay_hours INTEGER NOT NULL DEFAULT 168, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS keys (
  id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, label TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE, owner INTEGER NOT NULL, administrator INTEGER NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, key_id TEXT NOT NULL REFERENCES keys(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE, title TEXT NOT NULL, question TEXT NOT NULL DEFAULT '', description TEXT NOT NULL,
  kind TEXT NOT NULL, options TEXT NOT NULL, status TEXT NOT NULL, timing TEXT NOT NULL, audience TEXT NOT NULL, theme TEXT NOT NULL,
  close_after_hours INTEGER, opens_at TEXT, allow_change INTEGER NOT NULL DEFAULT 0, close_rules TEXT, created_at TEXT NOT NULL, opened_at TEXT, closes_at TEXT, closed_at TEXT, roll_code TEXT, roll_count INTEGER,
  encrypted INTEGER NOT NULL DEFAULT 0, public_key TEXT, counted INTEGER NOT NULL DEFAULT 1, mark_fill INTEGER NOT NULL DEFAULT 0, anonymity TEXT NOT NULL DEFAULT 'secret', i18n TEXT, auto_reminder TEXT NOT NULL DEFAULT 'none', auto_reminder_by TEXT, last_auto_reminder_on TEXT, publish_count INTEGER NOT NULL DEFAULT 0, lock_cancel INTEGER NOT NULL DEFAULT 0, published_key TEXT, cancelled_by TEXT, cancelled_ballots INTEGER, key_threshold INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS roll (
  id INTEGER PRIMARY KEY AUTOINCREMENT, poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE, address TEXT NOT NULL,
  fingerprint TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL, late INTEGER NOT NULL, added_at TEXT NOT NULL,
  voted_on TEXT, invited_on TEXT, invited_at TEXT, UNIQUE (poll_id, fingerprint));
-- A ballot holds no reference to a voter, and the roll holds no reference to a ballot. Only the day of a vote is kept on the roll.
CREATE TABLE IF NOT EXISTS ballots (poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE, seq INTEGER NOT NULL, choice TEXT NOT NULL, entry TEXT NOT NULL, voter_tag TEXT, superseded INTEGER NOT NULL DEFAULT 0, roll_id INTEGER, PRIMARY KEY (poll_id, seq));
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

  readonly #approvals: ApprovalStore;
  constructor(db: DatabaseSync, options: ServiceOptions) {
    if (options.secret.length < 32) throw new Error("The server secret must be at least 32 bytes");
    this.#db = db;
    this.#secret = options.secret;
    this.#now = options.now ?? (() => new Date());
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    db.exec(SCHEMA);
    this.#migrate();
    db.exec(APPROVAL_SCHEMA);
    this.#approvals = new ApprovalStore(db, this.#now, {
      policyOf: (spaceId) => this.approvalPolicy(spaceId),
      administratorsOf: (spaceId) => this.#administrators(spaceId),
      apply: (request) => this.#applyApproved(request),
    });
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
    addIfMissing("polls", columns, "key_threshold", "INTEGER NOT NULL DEFAULT 1");
    addIfMissing("polls", columns, "publish_count", "INTEGER NOT NULL DEFAULT 0");
    addIfMissing("polls", columns, "lock_cancel", "INTEGER NOT NULL DEFAULT 0");
    addIfMissing("polls", columns, "paged", "INTEGER NOT NULL DEFAULT 1");
    addIfMissing("polls", columns, "late_roll", "INTEGER NOT NULL DEFAULT 1");
    addIfMissing("polls", columns, "org_name", "TEXT");
    addIfMissing("polls", columns, "approval_json", "TEXT");
    addIfMissing("spaces", names("spaces"), "approval_rule", "TEXT NOT NULL DEFAULT 'none'");
    addIfMissing("spaces", names("spaces"), "approval_abstention", "TEXT NOT NULL DEFAULT 'neutral'");
    addIfMissing("spaces", names("spaces"), "approval_delay_hours", "INTEGER NOT NULL DEFAULT 168");
    // A poll published before the name was kept keeps the name the organization has now.
    this.#db.exec("UPDATE polls SET org_name = (SELECT name FROM spaces WHERE spaces.id = polls.space_id) WHERE org_name IS NULL AND status != 'draft'");
    addIfMissing("polls", columns, "published_key", "TEXT");
    addIfMissing("polls", columns, "cancelled_by", "TEXT");
    addIfMissing("polls", columns, "cancelled_ballots", "INTEGER");
    addIfMissing("polls", columns, "auto_reminder", "TEXT NOT NULL DEFAULT 'none'");
    addIfMissing("polls", columns, "auto_reminder_by", "TEXT");
    addIfMissing("polls", columns, "last_auto_reminder_on", "TEXT");
    addIfMissing("roll", rollColumns, "invited_at", "TEXT");
    addIfMissing("roll", rollColumns, "invite_count", "INTEGER NOT NULL DEFAULT 0");
    addIfMissing("roll", rollColumns, "first_invited_on", "TEXT");
    // Links sent before the exact moment was kept count as sent, at the latest by the end of that day or now, so that a
    // reminder is not offered too early. Their count is one.
    this.#db.prepare("UPDATE roll SET invited_at = MIN(invited_on || 'T23:59:59.000Z', ?) WHERE invited_on IS NOT NULL AND invited_at IS NULL").run(this.#iso());
    this.#db.exec("UPDATE roll SET invite_count = 1, first_invited_on = invited_on WHERE invited_on IS NOT NULL AND invite_count = 0");
    addIfMissing("polls", columns, "question", "TEXT NOT NULL DEFAULT ''");
    addIfMissing("polls", columns, "i18n", "TEXT");
    addIfMissing("polls", columns, "anonymity", "TEXT NOT NULL DEFAULT 'secret'");
    addIfMissing("ballots", names("ballots"), "roll_id", "INTEGER");
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

  updateSpace(session: Session, input: { name: string; locale: Locale; theme: ThemeName; timeZone: string }): Result<SpaceUpdate> {
    if (!session.owner) return problem("forbidden");
    const name = input.name.trim();
    if (name.length === 0) return problem("name_required");
    if (name.length > 80) return problem("name_too_long");
    if (!isTimeZone(input.timeZone)) return problem("invalid_time_zone");
    const current = this.getSpace(session.spaceId);
    if (!current) return problem("not_found");
    // Voters were told the name on their ballot and in their emails, so it stays while a poll is scheduled or open.
    if (name !== current.name && this.nameLocked(session.spaceId)) return problem("name_locked");
    // The default template changes at once. The name, the language and the time zone go through approval where it applies.
    this.#run("UPDATE spaces SET theme = ? WHERE id = ?", input.theme, session.spaceId);
    const sensitive = name !== current.name || input.locale !== current.locale || input.timeZone !== current.timeZone;
    let request: ApprovalRequest | null = null;
    if (sensitive) {
      const payload = { name, locale: input.locale, timeZone: input.timeZone };
      request = this.#approvals.propose(session.spaceId, { keyId: session.keyId, label: session.label }, "space_settings", "", sha256hex(JSON.stringify(payload)), payload);
      if (request === null) this.#run("UPDATE spaces SET name = ?, locale = ?, time_zone = ? WHERE id = ?", name, input.locale, input.timeZone, session.spaceId);
    }
    const space = this.getSpace(session.spaceId);
    return space ? ok({ ...space, request }) : problem("not_found");
  }

  // --- Approvals (ADR 0009) ---

  /** The organization's approval rule, with what an abstention means and how long a request stays open. */
  approvalPolicy(spaceId: string): ApprovalPolicy {
    const r = this.#one("SELECT approval_rule, approval_abstention, approval_delay_hours FROM spaces WHERE id = ?", spaceId);
    if (!r) return NO_APPROVAL;
    const delay = Number(r["approval_delay_hours"]);
    return {
      rule: isRule(r["approval_rule"]) ? r["approval_rule"] : "none",
      abstention: isMeaning(r["approval_abstention"]) ? r["approval_abstention"] : "neutral",
      delayHours: isDelay(delay) ? delay : NO_APPROVAL.delayHours,
    };
  }

  #administrators(spaceId: string): { id: string; label: string }[] {
    return this.#all("SELECT id, label FROM keys WHERE space_id = ? AND administrator = 1 AND revoked_at IS NULL ORDER BY created_at, id", spaceId).map((r) => ({ id: String(r["id"]), label: String(r["label"]) }));
  }

  /** How many administrators can answer a request in this organization. */
  administratorCount(spaceId: string): number {
    return this.#administrators(spaceId).length;
  }

  /** Whether changes of this organization need the answers of other administrators now. */
  approvalRequired(spaceId: string): boolean {
    return this.#approvals.required(spaceId);
  }

  /** Changes the rule. Where approvals already apply, this is a request like any other (it cannot be lowered alone). */
  setApprovalPolicy(session: Session, input: ApprovalPolicy): Result<{ request: ApprovalRequest | null }> {
    if (!session.owner) return problem("forbidden");
    if (!isRule(input.rule) || !isMeaning(input.abstention) || !isDelay(input.delayHours)) return problem("invalid_policy");
    const current = this.approvalPolicy(session.spaceId);
    if (current.rule === input.rule && current.abstention === input.abstention && current.delayHours === input.delayHours) return ok({ request: null });
    const payload = { rule: input.rule, abstention: input.abstention, delayHours: input.delayHours };
    const request = this.#approvals.propose(session.spaceId, { keyId: session.keyId, label: session.label }, "set_policy", "", sha256hex(JSON.stringify(payload)), payload);
    if (request === null) this.#writePolicy(session.spaceId, input);
    return ok({ request });
  }

  #writePolicy(spaceId: string, policy: ApprovalPolicy): void {
    this.#run("UPDATE spaces SET approval_rule = ?, approval_abstention = ?, approval_delay_hours = ? WHERE id = ?", policy.rule, policy.abstention, policy.delayHours, spaceId);
  }

  /** Carries out a request that was approved. False when it can no longer be done. */
  #applyApproved(request: ApprovalRequest): boolean {
    const p = request.payload;
    if (request.kind === "set_policy" && isRule(p["rule"]) && isMeaning(p["abstention"]) && isDelay(p["delayHours"])) {
      this.#writePolicy(request.spaceId, { rule: p["rule"], abstention: p["abstention"], delayHours: p["delayHours"] });
      return true;
    }
    if (request.kind === "space_settings" && typeof p["name"] === "string" && (p["locale"] === "fr" || p["locale"] === "en") && typeof p["timeZone"] === "string" && isTimeZone(p["timeZone"])) {
      const current = this.getSpace(request.spaceId);
      if (!current || (p["name"] !== current.name && this.nameLocked(request.spaceId))) return false;
      this.#run("UPDATE spaces SET name = ?, locale = ?, time_zone = ? WHERE id = ?", p["name"], p["locale"], p["timeZone"], request.spaceId);
      return true;
    }
    return false;
  }

  /**
   * What a poll's publication is made of, as one digest: its settings, its texts, its options, its dates and the
   * fingerprints of its roll. Approval is of exactly this. Any change to the draft changes it.
   */
  #pollContent(poll: Poll): { fields: Record<string, unknown>; rollDigest: string; digest: string } {
    const fields: Record<string, unknown> = {
      title: poll.title, question: poll.question, description: poll.description, kind: poll.kind, options: poll.options, translations: poll.translations,
      timing: poll.timing, audience: poll.audience, theme: poll.theme, opensAt: poll.opensAt, closesAt: poll.closesAt, rules: poll.rules,
      allowChange: poll.allowChange, encrypted: poll.encrypted, markFill: poll.markFill, anonymity: poll.anonymity, publishCount: poll.publishCount,
      lockCancel: poll.lockCancel, keyThreshold: poll.keyThreshold, paged: poll.paged, lateRoll: poll.lateRoll, autoReminder: poll.autoReminder,
    };
    const rollDigest = sha256hex(this.#all("SELECT fingerprint FROM roll WHERE poll_id = ? ORDER BY fingerprint", poll.id).map((r) => String(r["fingerprint"])).join("\n"));
    return { fields, rollDigest, digest: sha256hex(JSON.stringify({ fields, rollDigest })) };
  }

  /** The state of the approval of a draft: what is asked, what was answered, and whether the draft changed since. */
  pollApprovalState(session: Session, pollId: string): PollApprovalState {
    const poll = this.pollFor(session, pollId);
    const none: PollApprovalState = { required: false, state: "not_needed", request: null, changes: [], digest: "" };
    if (!poll) return none;
    const content = this.#pollContent(poll);
    const required = this.#approvals.required(poll.spaceId);
    if (poll.status !== "draft" || !required) return { ...none, required, digest: content.digest };
    const request = this.#approvals.latest(poll.spaceId, "publish_poll", poll.id);
    if (!request) return { required, state: "none", request: null, changes: [], digest: content.digest };
    if ((request.status === "pending" || request.status === "approved") && request.digest !== content.digest) {
      const before = (request.payload["fields"] ?? {}) as Record<string, unknown>;
      const changes = Object.keys(content.fields).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(content.fields[k]));
      if (request.payload["rollDigest"] !== content.rollDigest) changes.push("roll");
      return { required, state: "stale", request, changes, digest: content.digest };
    }
    const state: ApprovalState = request.status === "pending" ? "pending" : request.status === "approved" ? "approved" : request.status === "rejected" ? "rejected" : request.status === "lapsed" ? "lapsed" : "none";
    return { required, state, request, changes: [], digest: content.digest };
  }

  /** Asks the other administrators to approve publishing a draft. Null when no approval is needed. */
  requestPublication(session: Session, pollId: string): Result<{ request: ApprovalRequest | null }> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status !== "draft") return problem("locked");
    if (Number(this.#one("SELECT COUNT(*) AS n FROM roll WHERE poll_id = ?", pollId)?.["n"] ?? 0) === 0) return problem("roll_empty");
    if (poll.closesAt !== null && Date.parse(poll.closesAt) <= this.#now().getTime()) return problem("closes_past");
    const content = this.#pollContent(poll);
    const request = this.#approvals.propose(poll.spaceId, { keyId: session.keyId, label: session.label }, "publish_poll", poll.id, content.digest, { fields: content.fields, rollDigest: content.rollDigest });
    if (request) this.#log(pollId, session, "approval_requested", content.digest.slice(0, 12));
    return ok({ request });
  }

  /** An administrator's answer to a request. It names the digest the administrator was shown, so a changed draft is refused. */
  answerApproval(session: Session, requestId: string, answer: Answer, seenDigest: string): Result<ApprovalRequest> {
    if (!session.administrator) return problem("forbidden");
    if (answer !== "approve" && answer !== "reject" && answer !== "abstain") return problem("invalid_answer");
    const request = this.#approvals.get(session.spaceId, requestId);
    if (!request) return problem("not_found");
    if (request.status !== "pending") return problem("request_closed");
    if (request.digest !== seenDigest) return problem("approval_stale");
    if (request.kind === "publish_poll") {
      const poll = this.getPoll(request.subject);
      if (!poll || poll.status !== "draft" || this.#pollContent(poll).digest !== request.digest) return problem("approval_stale");
    }
    const done = this.#approvals.answer(session.spaceId, { keyId: session.keyId, label: session.label }, requestId, answer);
    if (!done) return problem("forbidden");
    if (request.kind === "publish_poll") this.#log(request.subject, session, `approval_${answer}`, done.status);
    return ok(done);
  }

  /** Open requests, and recent decisions, for an administrator or owner of the organization. */
  approvalRequests(session: Session): { open: ApprovalRequest[]; recent: ApprovalRequest[] } {
    return { open: this.#approvals.open(session.spaceId), recent: this.#approvals.recent(session.spaceId) };
  }

  /** How many open requests this key has not answered yet. */
  approvalsWaiting(session: Session): number {
    return session.administrator ? this.#approvals.waitingFor(session.spaceId, session.keyId) : 0;
  }

  #permitDigest(kind: ApprovalKind, subject: string, detail: unknown): string {
    return sha256hex(JSON.stringify({ kind, subject, detail: detail ?? null }));
  }

  /** What an action needs: nothing, or the permit made by an approved request that names exactly this action. */
  #gate(spaceId: string, kind: ActionKind, subject: string, detail: unknown): Result<{ requestId: string | null }> {
    if (!this.#approvals.required(spaceId)) return ok({ requestId: null });
    const permit = this.#approvals.permit(spaceId, kind, subject, this.#permitDigest(kind, subject, detail));
    return permit ? ok({ requestId: permit.id }) : problem("approval_required");
  }

  #use(gate: { requestId: string | null }): void {
    if (gate.requestId) this.#approvals.consume(gate.requestId);
  }

  /**
   * Asks the other administrators to approve one action. The request names the action exactly (the poll, the addresses,
   * the key's label and roles), so the permit it gives cannot be used for another one. Null when no approval is needed.
   */
  requestAction(session: Session, kind: ActionKind, subject: string, detail?: unknown): Result<{ request: ApprovalRequest | null }> {
    const ownerAction = kind === "add_key" || kind === "revoke_key" || kind === "delete_space";
    if (ownerAction ? !session.owner : !session.administrator) return problem("forbidden");
    const summary: Record<string, unknown> = {};
    if (kind === "add_key" && detail && typeof detail === "object") {
      const d = detail as { label?: string; owner?: boolean; administrator?: boolean };
      summary["label"] = d.label ?? "";
      summary["roles"] = [d.owner ? "owner" : null, d.administrator ? "administrator" : null].filter(Boolean);
    } else if (kind === "revoke_key") {
      const target = this.#one("SELECT label FROM keys WHERE id = ? AND space_id = ?", subject, session.spaceId);
      if (!target) return problem("not_found");
      summary["label"] = String(target["label"]);
    } else if (kind === "delete_space") {
      summary["name"] = this.getSpace(session.spaceId)?.name ?? "";
    } else {
      const poll = this.pollFor(session, subject);
      if (!poll) return problem("not_found");
      summary["title"] = poll.title;
      if (kind === "add_roll" && Array.isArray(detail)) summary["count"] = detail.length;
    }
    const request = this.#approvals.propose(session.spaceId, { keyId: session.keyId, label: session.label }, kind, subject, this.#permitDigest(kind, subject, detail), summary);
    if (request && subject !== "" && kind !== "revoke_key" && kind !== "delete_space") this.#log(subject, session, `approval_requested_${kind}`, request.digest.slice(0, 12));
    return ok({ request });
  }

  /** Where the approval of an action stands: nothing asked, waiting, approved and ready to use, rejected or lapsed. */
  actionApprovalState(session: Session, kind: ActionKind, subject: string, detail?: unknown): ActionApprovalState {
    const required = this.#approvals.required(session.spaceId);
    if (!required) return { required, state: "not_needed", request: null };
    const request = this.#approvals.latest(session.spaceId, kind, subject);
    if (!request || (request.status === "approved" || request.status === "pending") && request.digest !== this.#permitDigest(kind, subject, detail)) return { required, state: "none", request: null };
    if (request.status === "approved") return Date.parse(request.expiresAt) > this.#now().getTime() ? { required, state: "approved", request } : { required, state: "lapsed", request };
    const state: ApprovalState = request.status === "pending" ? "pending" : request.status === "rejected" ? "rejected" : request.status === "lapsed" ? "lapsed" : "none";
    return { required, state, request: state === "none" ? null : request };
  }

  /** What a publication needs, and the record of how it was approved. Used when a poll is opened or scheduled. */
  #publicationGate(poll: Poll): Result<{ requestId: string | null; approval: PollApproval }> {
    const content = this.#pollContent(poll);
    const policy = this.approvalPolicy(poll.spaceId);
    const at = this.#iso();
    if (!this.#approvals.required(poll.spaceId)) {
      return ok({ requestId: null, approval: { rule: policy.rule, approvals: 1, eligible: Math.max(1, this.#administrators(poll.spaceId).length), at, digest: content.digest } });
    }
    const request = this.#approvals.permit(poll.spaceId, "publish_poll", poll.id, content.digest);
    if (!request) return problem("approval_required");
    return ok({ requestId: request.id, approval: { rule: policy.rule, approvals: request.tally.approvals, eligible: request.tally.eligible, at, digest: content.digest } });
  }

  #stamp(pollId: string, gate: { requestId: string | null; approval: PollApproval }): void {
    this.#run("UPDATE polls SET approval_json = ? WHERE id = ?", JSON.stringify(gate.approval), pollId);
    if (gate.requestId) this.#approvals.consume(gate.requestId);
  }

  /** True while a poll of the organization is scheduled or open: its name cannot change then. */
  nameLocked(spaceId: string): boolean {
    return this.#one("SELECT 1 AS x FROM polls WHERE space_id = ? AND status IN ('scheduled', 'open') LIMIT 1", spaceId) !== undefined;
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
    const gate = this.#gate(session.spaceId, "add_key", "", { label, owner: input.owner, administrator: input.administrator });
    if (!gate.ok) return gate;
    const key = this.#newKeyValue();
    this.#insertKey(session.spaceId, label, key, input.owner, input.administrator);
    this.#use(gate.value);
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
      const gate = this.#gate(session.spaceId, "revoke_key", keyId, null);
      if (!gate.ok) return gate;
      this.#run("UPDATE keys SET revoked_at = ? WHERE id = ?", this.#iso(), keyId);
      this.#run("DELETE FROM sessions WHERE key_id = ?", keyId);
      this.#use(gate.value);
      return ok(null);
    });
  }

  /** Deletes the space with everything in it. An owner is needed, and must repeat the space name. */
  deleteSpace(session: Session, confirmName: string): Result<null> {
    if (!session.owner) return problem("forbidden");
    const space = this.getSpace(session.spaceId);
    if (!space) return problem("not_found");
    if (confirmName.trim() !== space.name) return problem("name_mismatch");
    const gate = this.#gate(session.spaceId, "delete_space", session.spaceId, null);
    if (!gate.ok) return gate;
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
      organization: r["org_name"] === null || r["org_name"] === undefined ? (this.getSpace(String(r["space_id"]))?.name ?? "") : String(r["org_name"]),
      title: String(r["title"]),
      question: String(r["question"] ?? ""),
      description: String(r["description"]),
      kind: r["kind"] === "choice" ? "choice" : "yes-no",
      options: JSON.parse(String(r["options"])) as PollOption[],
      status: r["status"] === "open" ? "open" : r["status"] === "closed" ? "closed" : r["status"] === "scheduled" ? "scheduled" : r["status"] === "cancelled" ? "cancelled" : "draft",
      timing: r["timing"] === "live" ? "live" : "close",
      audience: isAudience(r["audience"]) ? r["audience"] : "voters",
      theme: isTheme(r["theme"]) ? r["theme"] : DEFAULT_THEME,
      opensAt: r["opens_at"] === null ? null : String(r["opens_at"]),
      allowChange: r["allow_change"] === 1,
      rules: parseRules(r["close_rules"] === null ? null : String(r["close_rules"])),
      encrypted: r["encrypted"] === 1,
      counted: r["counted"] !== 0,
      markFill: r["mark_fill"] === 1,
      anonymity: isAnonymity(r["anonymity"]) ? r["anonymity"] : "secret",
      autoReminder: isAutoReminder(r["auto_reminder"]) ? r["auto_reminder"] : "none",
      publishCount: r["publish_count"] === 1,
      keyThreshold: Number(r["key_threshold"] ?? 1),
      lockCancel: r["lock_cancel"] === 1,
      paged: r["paged"] !== 0,
      lateRoll: r["late_roll"] !== 0,
      approval: parseApproval(r["approval_json"]),
      cancelled: r["cancelled_by"] === null || r["cancelled_by"] === undefined ? null : { by: String(r["cancelled_by"]), ballots: Number(r["cancelled_ballots"] ?? 0) },
      translations: parseTranslations(r["i18n"] === null ? null : String(r["i18n"])),
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
    if (input.question.trim().length === 0) return "question_required";
    if (input.question.length > 300) return "question_too_long";
    if (input.description.length > 2000) return "description_too_long";
    if (!isTiming(input.timing) || !isAudience(input.audience)) return "invalid_results";
    if (input.encrypted && input.timing === "live") return "encryption_needs_close";
    if (!isAnonymity(input.anonymity)) return "invalid_results";
    if (!isAutoReminder(input.autoReminder)) return "invalid_results";
    if (input.autoReminder !== "none" && !input.reminderPermission) return "attestation_required";
    if (!Number.isInteger(input.keyThreshold) || input.keyThreshold < 1 || input.keyThreshold > 20) return "invalid_threshold";
    if (input.keyThreshold > 1 && !input.encrypted) return "invalid_threshold";
    const languages = cleanLanguages(input.translations.languages);
    if (languages.length > 1 || input.translations.languages.length !== languages.length) {
      const optionCount = input.kind === "choice" ? input.options.filter((o) => o.label.trim().length > 0).length : 0;
      if (missingTexts({ ...input.translations, languages }, optionCount).length > 0) return "translation_missing";
    }
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
        `INSERT INTO polls (id, space_id, title, question, description, kind, options, status, timing, audience, theme, opens_at, closes_at, close_rules, allow_change, encrypted, counted, mark_fill, anonymity, i18n, auto_reminder, auto_reminder_by, publish_count, lock_cancel, key_threshold, paged, late_roll, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, session.spaceId, input.title.trim(), input.question.trim(), input.description.trim(), input.kind, JSON.stringify(this.#optionsOf(input)), input.timing, input.audience, input.theme, input.opensAt, input.closesAt, JSON.stringify(input.rules), input.allowChange ? 1 : 0, input.encrypted ? 1 : 0, input.encrypted ? 0 : 1, input.markFill ? 1 : 0, input.anonymity, JSON.stringify(input.translations), input.autoReminder, input.autoReminder === "none" ? null : session.label, input.publishCount ? 1 : 0, input.lockCancel ? 1 : 0, input.keyThreshold, input.paged ? 1 : 0, input.lateRoll ? 1 : 0, this.#iso(),
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
      "UPDATE polls SET title = ?, question = ?, description = ?, kind = ?, options = ?, timing = ?, audience = ?, theme = ?, opens_at = ?, closes_at = ?, close_rules = ?, allow_change = ?, encrypted = ?, counted = ?, mark_fill = ?, anonymity = ?, i18n = ?, auto_reminder = ?, auto_reminder_by = ?, publish_count = ?, lock_cancel = ?, key_threshold = ?, paged = ?, late_roll = ? WHERE id = ?",
      input.title.trim(), input.question.trim(), input.description.trim(), input.kind, JSON.stringify(this.#optionsOf(input)), input.timing, input.audience, input.theme, input.opensAt, input.closesAt, JSON.stringify(input.rules), input.allowChange ? 1 : 0, input.encrypted ? 1 : 0, input.encrypted ? 0 : 1, input.markFill ? 1 : 0, input.anonymity, JSON.stringify(input.translations), input.autoReminder, input.autoReminder === "none" ? null : session.label, input.publishCount ? 1 : 0, input.lockCancel ? 1 : 0, input.keyThreshold, input.paged ? 1 : 0, input.lateRoll ? 1 : 0, pollId,
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
    return this.#all("SELECT at, actor, action, detail FROM history WHERE poll_id = ? ORDER BY id DESC", pollId).map((r) => ({ at: String(r["at"]), actor: String(r["actor"]), action: String(r["action"]), detail: String(r["detail"]) }));
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
    if (poll.status === "open" && !poll.lateRoll) return problem("roll_locked");
    // Once scheduled, the roll is what was approved: it can change again after unscheduling.
    if (poll.status === "scheduled") return problem("roll_scheduled");
    const lines = text.split(/[\n\r,;]+/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return problem("nothing_entered");
    if (lines.length > MAX_ROLL) return problem("too_many_addresses");
    // Adding people to a poll that is already open is a change of what was approved.
    const gate = poll.status === "open" ? this.#gate(poll.spaceId, "add_roll", pollId, [...new Set(lines.map((l) => l.toLowerCase()))].sort()) : ok({ requestId: null });
    if (!gate.ok) return gate;
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
        // The address is kept as typed, for display and for sending. The normalized form only decides who is the same person.
        const parsed = parseAddress(line);
        const shown = parsed ? `${parsed.local.toLowerCase()}@${parsed.domain}` : check.normalized;
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
          pollId, shown, fingerprint, sha256hex(this.#token(pollId, fingerprint)), poll.status === "open" ? 1 : 0, this.#iso(),
        );
        added++;
      }
      if (added > 0) {
        this.#log(pollId, session, poll.status === "open" ? "roll_added_late" : "roll_added", String(added));
        this.#use(gate.value);
      }
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
      invitedAt: r["invited_at"] === null || r["invited_at"] === undefined ? null : String(r["invited_at"]),
      firstInvitedOn: r["first_invited_on"] === null || r["first_invited_on"] === undefined ? null : String(r["first_invited_on"]),
      invites: Number(r["invite_count"] ?? 0),
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
   * The entries a poll's links can be sent to by email: those who have not voted, and who have not been written to in the
   * last 24 hours. "new" is those never written to, "reminder" those written to before, or one entry by its number.
   * Each comes with its personal token.
   */
  invitees(session: Session, pollId: string, which: "new" | "reminder" | number): { id: number; address: string; token: string }[] {
    const poll = this.pollFor(session, pollId);
    if (!poll || poll.status !== "open") return [];
    const now = this.#now();
    return this.#all("SELECT id, address, fingerprint, status, invited_at FROM roll WHERE poll_id = ? ORDER BY id", pollId)
      .filter((r) => String(r["status"]) !== "voted")
      .filter((r) => {
        const last = r["invited_at"] === null ? null : String(r["invited_at"]);
        if (!mayWrite(last, now)) return false;
        return typeof which === "number" ? Number(r["id"]) === which : which === "new" ? last === null : last !== null;
      })
      .map((r) => ({ id: Number(r["id"]), address: String(r["address"]), token: this.#token(pollId, String(r["fingerprint"])) }));
  }

  /** When the next reminder can go out, if every participant who has not voted was written to less than a day ago. */
  reminderWait(session: Session, pollId: string): Date | null {
    const poll = this.pollFor(session, pollId);
    if (!poll || poll.status !== "open") return null;
    const now = this.#now();
    const waiting = this.#all("SELECT invited_at FROM roll WHERE poll_id = ? AND status != 'voted' AND invited_at IS NOT NULL", pollId)
      .map((r) => String(r["invited_at"]))
      .filter((at) => !mayWrite(at, now));
    if (waiting.length === 0) return null;
    return waiting.map(writeAgainAt).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  }

  /**
   * Holds the participants a message is about to go to: each is marked as written to now, after a check that they still
   * may be (not voted, not written to in the last 24 hours). Sending takes time, so the hold comes first: a second press
   * or the timer cannot send to the same people meanwhile. What each entry held before is returned, to put back for
   * those whose message did not go.
   */
  reserveInvites(pollId: string, ids: readonly number[]): InviteHold[] {
    const poll = this.getPoll(pollId);
    if (!poll || poll.status !== "open") return [];
    return this.#transaction(() => {
      const now = this.#now();
      const at = this.#iso();
      const holds: InviteHold[] = [];
      for (const id of ids) {
        const r = this.#one("SELECT status, invited_on, invited_at, invite_count, first_invited_on FROM roll WHERE id = ? AND poll_id = ?", id, pollId);
        if (!r || String(r["status"]) === "voted") continue;
        const last = r["invited_at"] === null ? null : String(r["invited_at"]);
        if (!mayWrite(last, now)) continue;
        holds.push({ id, invitedOn: r["invited_on"] === null ? null : String(r["invited_on"]), invitedAt: last, count: Number(r["invite_count"] ?? 0), firstInvitedOn: r["first_invited_on"] === null || r["first_invited_on"] === undefined ? null : String(r["first_invited_on"]) });
        this.#run("UPDATE roll SET invited_on = ?, invited_at = ?, invite_count = invite_count + 1, first_invited_on = COALESCE(first_invited_on, ?) WHERE id = ? AND poll_id = ?", at.slice(0, 10), at, at.slice(0, 10), id, pollId);
      }
      return holds;
    });
  }

  /** Puts back what was held for those whose message did not go. */
  releaseInvites(pollId: string, holds: readonly InviteHold[]): void {
    this.#transaction(() => {
      for (const h of holds) this.#run("UPDATE roll SET invited_on = ?, invited_at = ?, invite_count = ?, first_invited_on = ? WHERE id = ? AND poll_id = ?", h.invitedOn, h.invitedAt, h.count, h.firstInvitedOn, h.id, pollId);
    });
  }

  /** One line in the history: how many links or reminders went out (a count, no addresses). */
  recordSent(pollId: string, who: Session | string, action: string, count: number): void {
    if (count > 0) this.#log(pollId, who, action, String(count));
  }

  /** Holds and records in one step, for links already sent. */
  markInvited(session: Session, pollId: string, ids: readonly number[]): void {
    if (ids.length === 0 || !this.pollFor(session, pollId)) return;
    this.recordSent(pollId, session, "links_sent", this.reserveInvites(pollId, ids).length);
  }

  /** Open polls whose automatic reminder is due now, with those who should get it. Used by the timer of the server. */
  dueReminders(): { pollId: string; spaceId: string; targets: { id: number; address: string; token: string }[] }[] {
    const now = this.#now();
    const due: { pollId: string; spaceId: string; targets: { id: number; address: string; token: string }[] }[] = [];
    for (const r of this.#all("SELECT id FROM polls WHERE status = 'open' AND auto_reminder != 'none'")) {
      const poll = this.getPoll(String(r["id"]));
      if (!poll || poll.status !== "open" || poll.autoReminder === "none") continue;
      const tz = this.getSpace(poll.spaceId)?.timeZone ?? DEFAULT_TIME_ZONE;
      const last = this.#one("SELECT last_auto_reminder_on AS d FROM polls WHERE id = ?", poll.id)?.["d"];
      if (!reminderDue({ mode: poll.autoReminder, now, timeZone: tz, closesAt: poll.closesAt, lastOn: last === null || last === undefined ? null : String(last) })) continue;
      const targets = this.#all("SELECT id, fingerprint, address, invited_at FROM roll WHERE poll_id = ? AND status != 'voted' AND invited_at IS NOT NULL ORDER BY id", poll.id)
        .filter((e) => mayWrite(String(e["invited_at"]), now))
        .map((e) => ({ id: Number(e["id"]), address: String(e["address"]), token: this.#token(poll.id, String(e["fingerprint"])) }));
      due.push({ pollId: poll.id, spaceId: poll.spaceId, targets });
    }
    return due;
  }

  /**
   * Ends an automatic reminder run. Today counts as done when nobody was left to write to or at least one message went,
   * so the check does not repeat every few minutes. When every message failed, it is tried again at the next check.
   */
  finishAutoReminder(pollId: string, sent: number, failed: number, localDay: string): void {
    if (sent > 0 || failed === 0) this.#run("UPDATE polls SET last_auto_reminder_on = ? WHERE id = ?", localDay, pollId);
    this.recordSent(pollId, "automatic", "reminder_sent", sent);
  }

  /** Holds, records and ends the run in one step, for messages already sent. */
  markAutoReminded(pollId: string, ids: readonly number[], localDay: string): void {
    const held = this.reserveInvites(pollId, ids);
    this.finishAutoReminder(pollId, held.length, 0, localDay);
  }

  // ---- Opening and closing ----

  /**
   * The key material of a sealed poll at opening or scheduling: the public key to store, and either one counting key or the
   * shares of it, one for each administrator, that the person opening hands out. Nothing but the public key is kept.
   */
  #newKeys(poll: Poll, session: Session): Result<{ publicKey: string; countingKey: string | null; shares: { label: string; share: string }[] }> {
    if (poll.keyThreshold <= 1) {
      const keys = generateCountingKeys();
      return ok({ publicKey: keys.publicKey, countingKey: keys.countingKey, shares: [] });
    }
    const admins = this.#all("SELECT label FROM keys WHERE space_id = ? AND administrator = 1 AND revoked_at IS NULL ORDER BY created_at, id", session.spaceId).map((r) => String(r["label"]));
    if (admins.length < poll.keyThreshold) return problem("threshold_needs_admins");
    const keys = generateCountingKeyBytes();
    const shares = shareSecret(keys.secret, poll.keyThreshold, admins.length);
    return ok({ publicKey: keys.publicKey, countingKey: null, shares: admins.map((label, i) => ({ label, share: shares[i] ?? "" })) });
  }

  /** Freezes the roll and opens the poll. Used by an administrator opening it and by a scheduled opening. */
  #openNow(poll: Poll, at: string, who: Session | string): Result<null> {
    const fingerprints = this.#all("SELECT fingerprint FROM roll WHERE poll_id = ?", poll.id).map((r) => String(r["fingerprint"]));
    if (fingerprints.length === 0) return problem("roll_empty");
    const frozen = freezeRoll(fingerprints);
    this.#run("UPDATE polls SET status = 'open', opened_at = ?, roll_code = ?, roll_count = ?, org_name = COALESCE(org_name, (SELECT name FROM spaces WHERE spaces.id = polls.space_id)) WHERE id = ?", at, frozen.code, frozen.count, poll.id);
    this.#log(poll.id, who, "opened", `${frozen.count} · ${frozen.code}${poll.encrypted ? " · sealed" : ""}`);
    return ok(null);
  }

  /** Opens a poll now. For a sealed poll that was not scheduled, the counting key (or its shares) is returned here, once, and kept nowhere. */
  openPoll(session: Session, pollId: string): Result<{ poll: Poll; countingKey: string | null; shares: { label: string; share: string }[] }> {
    let countingKey: string | null = null;
    let shares: { label: string; share: string }[] = [];
    const result = this.#transaction((): Result<null> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      if (poll.status !== "draft" && poll.status !== "scheduled") return problem("locked");
      if (poll.closesAt !== null && Date.parse(poll.closesAt) <= this.#now().getTime()) return problem("closes_past");
      // A scheduled poll was approved when it was scheduled. A draft needs approval where the organization asks for it.
      const gate = poll.status === "draft" ? this.#publicationGate(poll) : null;
      if (gate && !gate.ok) return gate;
      // Opening a scheduled poll sooner than the approved date is a change of what was approved.
      const early = poll.status === "scheduled" ? this.#gate(poll.spaceId, "open_scheduled", pollId, null) : null;
      if (early && !early.ok) return early;
      if (poll.encrypted && poll.status === "draft") {
        const keys = this.#newKeys(poll, session);
        if (!keys.ok) return keys;
        countingKey = keys.value.countingKey;
        shares = keys.value.shares;
        this.#run("UPDATE polls SET public_key = ? WHERE id = ?", keys.value.publicKey, pollId);
      }
      const opened = this.#openNow(poll, this.#iso(), session);
      if (opened.ok && gate?.ok) this.#stamp(pollId, gate.value);
      if (opened.ok && early?.ok) this.#use(early.value);
      return opened;
    });
    if (!result.ok) return result;
    const poll = this.getPoll(pollId);
    return poll ? ok({ poll, countingKey, shares }) : problem("not_found");
  }

  /**
   * Plans the opening for the date chosen. A sealed poll gets its key pair now, since nobody will be there at the moment
   * of opening to be shown the counting key: it is returned here, once.
   */
  schedulePoll(session: Session, pollId: string): Result<{ poll: Poll; countingKey: string | null; shares: { label: string; share: string }[] }> {
    let countingKey: string | null = null;
    let shares: { label: string; share: string }[] = [];
    const result = this.#transaction((): Result<null> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      if (poll.status !== "draft") return problem("locked");
      if (poll.opensAt === null || Date.parse(poll.opensAt) <= this.#now().getTime()) return problem("opens_past");
      if (poll.closesAt === null || Date.parse(poll.closesAt) <= Date.parse(poll.opensAt)) return problem("dates_order");
      if (Number(this.#one("SELECT COUNT(*) AS n FROM roll WHERE poll_id = ?", pollId)?.["n"] ?? 0) === 0) return problem("roll_empty");
      const gate = this.#publicationGate(poll);
      if (!gate.ok) return gate;
      let publicKey: string | null = null;
      if (poll.encrypted) {
        const keys = this.#newKeys(poll, session);
        if (!keys.ok) return keys;
        publicKey = keys.value.publicKey;
        countingKey = keys.value.countingKey;
        shares = keys.value.shares;
      }
      this.#stamp(pollId, gate.value);
      this.#run("UPDATE polls SET status = 'scheduled', public_key = ?, org_name = (SELECT name FROM spaces WHERE spaces.id = polls.space_id) WHERE id = ?", publicKey, pollId);
      this.#log(pollId, session, "scheduled", poll.opensAt);
      return ok(null);
    });
    if (!result.ok) return result;
    const poll = this.getPoll(pollId);
    return poll ? ok({ poll, countingKey, shares }) : problem("not_found");
  }

  /** Takes a poll back from scheduled to draft. The counting key given at scheduling stops being valid. */
  unschedulePoll(session: Session, pollId: string): Result<Poll> {
    const poll = this.pollFor(session, pollId);
    if (!poll) return problem("not_found");
    if (poll.status !== "scheduled") return problem("locked");
    this.#run("UPDATE polls SET status = 'draft', public_key = NULL, approval_json = NULL, org_name = NULL WHERE id = ?", pollId);
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
      // Closing by hand before the deadline (or on a poll with none) needs approval. The deadline and the closing rules
      // fixed at opening do not: the approval of the opening covered them.
      const manual = poll.closesAt === null || Date.parse(poll.closesAt) > this.#now().getTime();
      const gate = manual ? this.#gate(poll.spaceId, "close_poll", pollId, null) : ok({ requestId: null });
      if (!gate.ok) return gate;
      if (poll.encrypted) {
        const counted = this.#count(poll, countingKey ?? "");
        if (!counted.ok) return counted;
      }
      this.#run("UPDATE polls SET status = 'closed', closed_at = ? WHERE id = ?", this.#iso(), pollId);
      this.#use(gate.value);
      this.#log(pollId, session, "closed", poll.encrypted ? "counted" : "");
      const next = this.getPoll(pollId);
      return next ? ok(next) : problem("not_found");
    });
  }

  /**
   * Cancels a poll: its results are never revealed to anyone. The ballots are erased, so that they cannot be read later
   * either. Possible while the poll is scheduled or open, or closed with sealed ballots not yet counted. A poll whose
   * results have been published cannot be cancelled.
   */
  cancelPoll(session: Session, pollId: string): Result<Poll> {
    return this.#transaction((): Result<Poll> => {
      const poll = this.pollFor(session, pollId);
      if (!poll) return problem("not_found");
      const allowed = poll.status === "scheduled" || poll.status === "open" || (poll.status === "closed" && poll.encrypted && !poll.counted);
      if (!allowed) return problem("locked");
      const cast = Number(this.#one("SELECT COUNT(*) AS n FROM ballots WHERE poll_id = ?", pollId)?.["n"] ?? 0);
      // A poll can be set so that voting, once begun, cannot be called off: that is how a result is kept from being buried.
      if (poll.lockCancel && cast > 0) return problem("cancel_locked");
      const gate = this.#gate(poll.spaceId, "cancel_poll", pollId, null);
      if (!gate.ok) return gate;
      this.#use(gate.value);
      this.#run("DELETE FROM ballots WHERE poll_id = ?", pollId);
      this.#run("UPDATE polls SET status = 'cancelled', closed_at = ?, public_key = NULL, cancelled_by = ?, cancelled_ballots = ? WHERE id = ?", this.#iso(), session.label, cast, pollId);
      this.#log(pollId, session, "cancelled", "");
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
    countingKey = keyFromInput(countingKey);
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
    // A poll that publishes its count also publishes the key, so that anyone can open the sealed ballots of the ledger.
    if (poll.publishCount) this.#run("UPDATE polls SET published_key = ? WHERE id = ?", countingKey.trim(), poll.id);
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
          questions: [{ id: "choice", type: "single", required: true, label: { en: poll.question || poll.title }, options: poll.options.map((o) => ({ id: o.id, label: { en: o.label ?? o.id } })) }],
        },
      ],
    });
  }

  castBallot(token: string, choice: string | undefined): Result<{ receipt: string }> {
    return this.#transaction((): Result<{ receipt: string }> => {
      const link = this.byToken(token);
      if (!link) return problem("unknown_link");
      const { poll } = link;
      if (poll.status !== "open") return problem(poll.status === "closed" ? "closed" : poll.status === "cancelled" ? "cancelled" : "not_open");
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
      // A named poll keeps the roll entry beside the ballot, to show who answered what; a secret one never does.
      this.#run("INSERT INTO ballots (poll_id, seq, choice, entry, voter_tag, roll_id) VALUES (?, ?, ?, ?, ?, ?)", poll.id, seq, poll.encrypted ? "" : choice, entry, tag, poll.anonymity === "named" ? Number(row["id"]) : null);
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
    if (!poll || poll.status === "draft" || poll.status === "scheduled" || poll.status === "cancelled") return null;
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
      answers: access.totals && poll.anonymity === "named" ? this.#answers(poll, viewer) : null,
    };
  }

  /** Who answered what in a named poll. An anonymous viewer sees the addresses partly hidden. */
  #answers(poll: Poll, viewer: Viewer): { who: string; choice: string }[] {
    return this.#all(
      "SELECT r.address AS address, b.choice AS choice FROM ballots b JOIN roll r ON r.id = b.roll_id WHERE b.poll_id = ? AND b.superseded = 0 AND b.choice != '' ORDER BY r.id",
      poll.id,
    ).map((r) => ({ who: viewer === "anyone" ? maskAddress(String(r["address"])) : String(r["address"]), choice: String(r["choice"]) }));
  }

  /** Who a member is, for the results page they opened with their link. */
  viewerOfToken(token: string): { pollId: string; viewer: Viewer } | null {
    const link = this.byToken(token);
    return link ? { pollId: link.poll.id, viewer: "voter" } : null;
  }

  /**
   * What a poll that publishes its count shows after the count: every ballot with its receipt code and its choice, and the
   * counting key of a sealed poll. Only to those who may see the totals, and only once the poll is closed and counted.
   */
  publication(pollId: string, viewer: Viewer): { countingKey: string | null; root: string; ballots: { receipt: string; choice: string; replaced: boolean }[] } | null {
    const poll = this.getPoll(pollId);
    if (!poll || poll.status !== "closed" || !poll.counted || !poll.publishCount) return null;
    if (!accessTo(poll, viewer).totals) return null;
    // The order is that of the receipt codes, not of casting: the order of casting, set beside who was seen voting
    // while the poll was open, would tie a published choice to a person.
    const rows = this.#byLeaf(this.#all("SELECT choice, entry, superseded FROM ballots WHERE poll_id = ?", pollId));
    const log = new MerkleLog();
    const ballots = rows.map((r) => {
      log.append(r.bytes);
      return { receipt: r.receipt, choice: String(r.row["choice"]), replaced: r.row["superseded"] === 1 };
    });
    const key = this.#one("SELECT published_key AS k FROM polls WHERE id = ?", pollId)?.["k"];
    return { countingKey: typeof key === "string" ? key : null, root: log.root(), ballots };
  }

  /** The ledger entries themselves (ciphertexts for a sealed poll), for someone who recounts with the published key. */
  ledgerEntries(pollId: string, viewer: Viewer): { receipt: string; entry: string }[] | null {
    if (!this.publication(pollId, viewer)) return null;
    return this.#byLeaf(this.#all("SELECT entry FROM ballots WHERE poll_id = ?", pollId)).map((r) => ({ receipt: r.receipt, entry: String(r.row["entry"]) }));
  }

  /**
   * Ballots in the canonical order of the published ledger: by leaf hash. The order of casting is not published, and the
   * Merkle root is a function of the set of ballots alone, so it can be recomputed from a list in this order.
   */
  #byLeaf(rows: Record<string, unknown>[]): { row: Record<string, unknown>; bytes: Uint8Array; hash: string; receipt: string }[] {
    return rows
      .map((row) => {
        const bytes = new TextEncoder().encode(String(row["entry"]));
        const hash = toHex(hashLeaf(bytes));
        return { row, bytes, hash, receipt: receiptCode(hash) };
      })
      .sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  }

  // ---- Ledger ----

  #log_(pollId: string): MerkleLog {
    const log = new MerkleLog();
    for (const r of this.#byLeaf(this.#all("SELECT entry FROM ballots WHERE poll_id = ?", pollId))) log.append(r.bytes);
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

/** "marie.tremblay@example.org" as "m***@e***.org": enough to recognise one's own, not to identify another. */
export function maskAddress(address: string): string {
  const at = address.lastIndexOf("@");
  if (at < 1) return "***";
  const domain = address.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${address[0]}***@${host[0] ?? ""}***${tld}`;
}

function parseApproval(json: unknown): PollApproval | null {
  if (typeof json !== "string") return null;
  try {
    const v = JSON.parse(json) as Partial<PollApproval>;
    if ((v.rule === "none" || v.rule === "majority" || v.rule === "all") && typeof v.approvals === "number" && typeof v.eligible === "number" && typeof v.at === "string" && typeof v.digest === "string") return v as PollApproval;
  } catch {
    // An unreadable record counts as none.
  }
  return null;
}

function parseTranslations(json: string | null): Translations {
  if (!json) return NO_TRANSLATIONS;
  try {
    const raw = JSON.parse(json) as Partial<Translations>;
    return {
      languages: cleanLanguages(Array.isArray(raw.languages) ? raw.languages : []),
      title: raw.title && typeof raw.title === "object" ? raw.title : {},
      question: raw.question && typeof raw.question === "object" ? raw.question : {},
      description: raw.description && typeof raw.description === "object" ? raw.description : {},
      options: Array.isArray(raw.options) ? raw.options : [],
    };
  } catch {
    return NO_TRANSLATIONS;
  }
}
