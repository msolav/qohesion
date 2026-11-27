// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { NO_RULES } from "../close-rules.js";
import { NO_TRANSLATIONS } from "../poll-i18n.js";
import { Service, maskAddress, type PollInput, type Session } from "./service.js";

let now = new Date("2026-12-01T15:00:00Z");
let service: Service;
let owner: Session;

const input = (over: Partial<PollInput> = {}): PollInput => ({
  title: "Budget 2027",
  question: "Do you adopt the budget of $12,400 for 2027?",
  description: "",
  kind: "yes-no",
  options: [],
  timing: "close",
  audience: "voters",
  theme: "ballot-paper",
  opensAt: null,
  closesAt: "2027-01-01T00:00:00.000Z",
  rules: NO_RULES,
  allowChange: false,
  autoReminder: "none",
  reminderPermission: false,
  publishCount: false,
  keyThreshold: 1,
  lockCancel: false,
  paged: true,
  lateRoll: true,
  encrypted: false,
  markFill: false,
  anonymity: "secret",
  translations: NO_TRANSLATIONS,
  ...over,
});

const opts = (...labels: string[]) => labels.map((label) => ({ label, icon: null, color: null }));

function must<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(`Unexpected problem: ${r.error}`);
  return r.value;
}

beforeEach(() => {
  now = new Date("2026-12-01T15:00:00Z");
  service = new Service(new DatabaseSync(":memory:"), { secret: new Uint8Array(32).fill(7), now: () => now });
  const created = must(service.createSpace({ name: "Maple Court Association", locale: "en" }));
  const token = service.signIn(created.key);
  owner = service.session(token ?? "") as Session;
});

function openedPoll(over: Partial<PollInput> = {}, addresses = "a@example.com\nb@example.com\nc@example.com") {
  const poll = must(service.createPoll(owner, input(over)));
  must(service.addToRoll(owner, poll.id, addresses));
  must(service.openPoll(owner, poll.id));
  const tokens = [...service.voterTokens(owner, poll.id).values()];
  return { poll, tokens };
}

describe("spaces and keys", () => {
  it("creates a space whose first key holds both roles, and signs in with it in any spelling", () => {
    const created = must(service.createSpace({ name: "Council", locale: "fr" }));
    expect(created.key).toMatch(/^QK-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}$/);
    const loose = created.key.toLowerCase().replaceAll("-", " ");
    const session = service.session(service.signIn(loose) ?? "");
    expect(session).toMatchObject({ owner: true, administrator: true });
  });

  it("refuses an unknown key, an empty name and a missing session", () => {
    expect(service.signIn("QK-AAAAAA-AAAAAA-AAAAAA-AAAAAA")).toBeNull();
    expect(service.createSpace({ name: "  ", locale: "en" })).toEqual({ ok: false, error: "name_required" });
    expect(service.session(undefined)).toBeNull();
    expect(service.session("nope")).toBeNull();
  });

  it("keeps the roles apart: an administrator-only key cannot manage keys, an owner-only key runs no polls", () => {
    const admin = must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    const adminSession = service.session(service.signIn(admin.key) ?? "") as Session;
    expect(service.createKey(adminSession, { label: "x", owner: true, administrator: false })).toEqual({ ok: false, error: "forbidden" });
    expect(service.listKeys(adminSession)).toEqual([]);

    const treasurer = must(service.createKey(owner, { label: "Treasurer", owner: true, administrator: false }));
    const treasurerSession = service.session(service.signIn(treasurer.key) ?? "") as Session;
    expect(service.createPoll(treasurerSession, input())).toEqual({ ok: false, error: "forbidden" });
    expect(service.listPolls(treasurerSession)).toEqual([]);
  });

  it("revokes a key and ends its sessions, but never the last owner key", () => {
    const other = must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    const token = service.signIn(other.key) ?? "";
    const id = service.listKeys(owner).find((k) => k.label === "Clerk")?.id ?? "";
    must(service.revokeKey(owner, id));
    expect(service.session(token)).toBeNull();
    expect(service.signIn(other.key)).toBeNull();
    expect(service.revokeKey(owner, owner.keyId)).toEqual({ ok: false, error: "last_owner" });
  });

  it("keeps spaces apart", () => {
    const poll = must(service.createPoll(owner, input()));
    const second = must(service.createSpace({ name: "Other", locale: "en" }));
    const otherSession = service.session(service.signIn(second.key) ?? "") as Session;
    expect(service.pollFor(otherSession, poll.id)).toBeNull();
    expect(service.listPolls(otherSession)).toEqual([]);
    expect(service.addToRoll(otherSession, poll.id, "a@example.com")).toEqual({ ok: false, error: "not_found" });
  });

  it("deletes a space only when its name is repeated", () => {
    expect(service.deleteSpace(owner, "wrong")).toEqual({ ok: false, error: "name_mismatch" });
    must(service.deleteSpace(owner, "Maple Court Association"));
    expect(service.session(service.signIn("x") ?? "")).toBeNull();
  });
});

describe("polls and the roll", () => {
  it("validates a poll", () => {
    expect(service.createPoll(owner, input({ title: " " }))).toEqual({ ok: false, error: "title_required" });
    expect(service.createPoll(owner, input({ kind: "choice", options: opts("Only one") }))).toEqual({ ok: false, error: "options_too_few" });
    expect(service.createPoll(owner, input({ kind: "choice", options: opts("Red", "red") }))).toEqual({ ok: false, error: "options_duplicate" });
    expect(service.createPoll(owner, input({ question: " " }))).toEqual({ ok: false, error: "question_required" });
    expect(service.createPoll(owner, input({ closesAt: "" }))).toEqual({ ok: false, error: "closes_required" });
    expect(service.createPoll(owner, input({ closesAt: "2026-11-30T00:00:00.000Z" }))).toEqual({ ok: false, error: "closes_past" });
    expect(service.createPoll(owner, input({ opensAt: "2026-12-20T00:00:00.000Z", closesAt: "2026-12-10T00:00:00.000Z" }))).toEqual({ ok: false, error: "dates_order" });
    expect(service.createPoll(owner, input({ allowChange: true }))).toEqual({ ok: false, error: "change_needs_encryption" });
    expect(service.createPoll(owner, input({ encrypted: true, rules: { afterVotes: null, turnoutPercent: null, threshold: "majority" } }))).toEqual({ ok: false, error: "rules_need_readable" });
    expect(service.createPoll(owner, input({ rules: { afterVotes: 0, turnoutPercent: null, threshold: null } }))).toEqual({ ok: false, error: "invalid_rule" });
    const poll = must(service.createPoll(owner, input({ kind: "choice", options: opts("Red", "Blue", " ") })));
    expect(poll.options.map((o) => o.label)).toEqual(["Red", "Blue"]);
  });

  it("keeps one setting for how the colours are drawn, for the whole poll", () => {
    expect(must(service.createPoll(owner, input({ markFill: true }))).markFill).toBe(true);
    expect(must(service.createPoll(owner, input())).markFill).toBe(false);
    const poll = must(service.createPoll(owner, input({ markFill: true })));
    expect(must(service.updatePoll(owner, poll.id, input({ markFill: false }))).markFill).toBe(false);
  });

  it("keeps the icon and colour of each option, refuses unknown ones, and does not give a yes-no poll any", () => {
    const styled = must(service.createPoll(owner, input({ kind: "choice", options: [{ label: "Garden", icon: "tree", color: "green" }, { label: "Roof", icon: null, color: "amber" }, { label: "Neither", icon: "dash", color: null }] })));
    expect(styled.options).toEqual([
      { id: "o1", label: "Garden", icon: "tree", color: "green" },
      { id: "o2", label: "Roof", icon: null, color: "amber" },
      { id: "o3", label: "Neither", icon: "dash", color: null },
    ]);
    expect(service.createPoll(owner, input({ kind: "choice", options: [{ label: "A", icon: "<script>", color: null }, { label: "B", icon: null, color: null }] }))).toEqual({ ok: false, error: "option_style_invalid" });
    expect(service.createPoll(owner, input({ kind: "choice", options: [{ label: "A", icon: null, color: "#ff0000" }, { label: "B", icon: null, color: null }] }))).toEqual({ ok: false, error: "option_style_invalid" });
    expect(must(service.createPoll(owner, input({ kind: "yes-no", options: [{ label: "x", icon: "star", color: "red" }] }))).options.every((o) => !o.icon && !o.color)).toBe(true);
  });

  it("adds addresses once, reports duplicates and rejects bad ones", () => {
    const poll = must(service.createPoll(owner, input()));
    const r = must(service.addToRoll(owner, poll.id, "a@example.com, B@Example.com;\nnot-an-address\nA@example.com\nx@mailinator.com"));
    expect(r.added).toBe(2);
    expect(r.duplicates).toBe(1);
    expect(r.rejected.map((x) => x.reason).sort()).toEqual(["disposable", "invalid"]);
    expect(service.roll(owner, poll.id).map((e) => e.address)).toEqual(["a@example.com", "b@example.com"]);
  });

  it("will not open without a roll, and freezes the roll code and count when it opens", () => {
    const poll = must(service.createPoll(owner, input()));
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "roll_empty" });
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    const opened = must(service.openPoll(owner, poll.id)).poll;
    expect(opened.status).toBe("open");
    expect(opened.rollCount).toBe(2);
    expect(opened.rollCode).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("locks settings and options once open, and marks later additions as late", () => {
    const { poll } = openedPoll();
    expect(service.updatePoll(owner, poll.id, input({ title: "Changed" }))).toEqual({ ok: false, error: "locked" });
    expect(service.deletePoll(owner, poll.id)).toEqual({ ok: false, error: "locked" });
    must(service.addToRoll(owner, poll.id, "late@example.com"));
    const entries = service.roll(owner, poll.id);
    expect(entries.find((e) => e.address === "late@example.com")?.late).toBe(true);
    expect(entries.find((e) => e.address === "a@example.com")?.late).toBe(false);
    expect(service.removeFromRoll(owner, poll.id, entries[0]?.id ?? 0)).toEqual({ ok: false, error: "locked" });
  });

  it("closes automatically at the set time", () => {
    const { poll } = openedPoll({ closesAt: "2026-12-01T17:00:00.000Z" });
    expect(service.getPoll(poll.id)?.status).toBe("open");
    now = new Date("2026-12-01T17:00:01Z");
    expect(service.getPoll(poll.id)?.status).toBe("closed");
  });
});

describe("voting", () => {
  it("records one ballot per link, returns a receipt and refuses a second vote", () => {
    const { tokens } = openedPoll();
    const first = must(service.castBallot(tokens[0] ?? "", "for"));
    expect(first.receipt).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(service.castBallot(tokens[0] ?? "", "against")).toEqual({ ok: false, error: "already_voted" });
  });

  it("refuses an unknown link, an unknown option, no answer, a draft and a closed poll", () => {
    const { poll, tokens } = openedPoll();
    expect(service.castBallot("NOTALINK", "for")).toEqual({ ok: false, error: "unknown_link" });
    expect(service.castBallot(tokens[0] ?? "", "maybe")).toMatchObject({ ok: false, error: "unknown_option" });
    expect(service.castBallot(tokens[0] ?? "", undefined)).toMatchObject({ ok: false, error: "required" });
    must(service.closePoll(owner, poll.id));
    expect(service.castBallot(tokens[1] ?? "", "for")).toEqual({ ok: false, error: "closed" });
  });

  it("accepts a ballot from an address added after opening", () => {
    const { poll } = openedPoll();
    must(service.addToRoll(owner, poll.id, "late@example.com"));
    const tokens = [...service.voterTokens(owner, poll.id).values()];
    expect(service.castBallot(tokens[3] ?? "", "abstain").ok).toBe(true);
  });

  it("shows the roll that someone voted, never the choice, and the day only", () => {
    const { poll, tokens } = openedPoll();
    must(service.castBallot(tokens[1] ?? "", "against"));
    const voted = service.roll(owner, poll.id).filter((e) => e.status === "voted");
    expect(voted).toHaveLength(1);
    expect(voted[0]?.votedOn).toBe("2026-12-01");
    expect(JSON.stringify(service.roll(owner, poll.id))).not.toContain("against");
  });

  it("stores no link between a ballot and a voter", () => {
    const db = new DatabaseSync(":memory:");
    new Service(db, { secret: new Uint8Array(32).fill(1) });
    const columns = (table: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
    // A ballot never names its voter. Only a poll that lets members change their vote keeps a pseudonym (no readable choice: such a poll is sealed).
    expect(columns("ballots")).toEqual(["poll_id", "seq", "choice", "entry", "voter_tag", "superseded", "roll_id"]);
    // roll_id is filled only for a poll that says on its ballot that answers are shown with names; the secret test above checks that it stays empty.
    expect(columns("roll").some((c) => /choice|ballot/.test(c))).toBe(false);
  });
});

describe("results visibility", () => {
  it("hides everything but turnout from administrators while a close-timed poll is open", () => {
    const { poll, tokens } = openedPoll();
    must(service.castBallot(tokens[0] ?? "", "for"));
    expect(service.resultsFor(poll.id, "administrator")).toMatchObject({ turnout: 1, counts: null });
    expect(service.resultsFor(poll.id, "voter")).toMatchObject({ turnout: null, counts: null });
    expect(service.resultsFor(poll.id, "anyone")).toMatchObject({ turnout: null, counts: null });
  });

  it("shows live totals to the chosen audience as ballots arrive", () => {
    const { poll, tokens } = openedPoll({ timing: "live", audience: "voters" });
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.castBallot(tokens[1] ?? "", "against"));
    expect(service.resultsFor(poll.id, "voter")).toMatchObject({ turnout: 2, counts: { for: 1, against: 1, abstain: 0 } });
    expect(service.resultsFor(poll.id, "anyone")?.counts).toBeNull();
    expect(service.resultsFor(poll.id, "administrator")?.counts).toEqual({ for: 1, against: 1, abstain: 0 });
  });

  it("shows live totals to anyone when the audience is anyone", () => {
    const { poll, tokens } = openedPoll({ timing: "live", audience: "anyone" });
    must(service.castBallot(tokens[0] ?? "", "abstain"));
    expect(service.resultsFor(poll.id, "anyone")?.counts).toEqual({ for: 0, against: 0, abstain: 1 });
  });

  it("gives the final totals to the audience once closed, and a draft has none", () => {
    const draft = must(service.createPoll(owner, input()));
    expect(service.resultsFor(draft.id, "administrator")).toBeNull();
    const { poll, tokens } = openedPoll({}, "a@example.com\nb@example.com");
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.closePoll(owner, poll.id));
    expect(service.resultsFor(poll.id, "voter")?.counts).toEqual({ for: 1, against: 0, abstain: 0 });
    expect(service.resultsFor(poll.id, "anyone")?.counts).toBeNull();
  });
});

describe("dates, closing rules and changing a vote", () => {
  const tokensOf = (id: string) => [...service.voterTokens(owner, id).values()];

  it("opens by itself at the scheduled time, freezing the roll then, and keeps the key given at scheduling", () => {
    const poll = must(service.createPoll(owner, input({ encrypted: true, opensAt: "2026-12-02T15:00:00.000Z", closesAt: "2026-12-09T15:00:00.000Z" })));
    expect(service.schedulePoll(owner, poll.id)).toEqual({ ok: false, error: "roll_empty" });
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    const scheduled = must(service.schedulePoll(owner, poll.id));
    expect(scheduled.poll.status).toBe("scheduled");
    expect(scheduled.countingKey).toMatch(/^QC-/);
    expect(service.castBallot(tokensOf(poll.id)[0] ?? "", "for")).toEqual({ ok: false, error: "not_open" });
    expect(service.resultsFor(poll.id, "administrator")).toBeNull();
    // Once scheduled, the roll is what was set: it cannot grow before the opening.
    expect(service.addToRoll(owner, poll.id, "c@example.com")).toEqual({ ok: false, error: "roll_scheduled" });
    now = new Date("2026-12-02T15:00:01Z");
    const opened = service.getPoll(poll.id);
    expect(opened).toMatchObject({ status: "open", rollCount: 2 });
    must(service.castBallot(tokensOf(poll.id)[0] ?? "", "for"));
    now = new Date("2026-12-09T15:00:01Z");
    expect(service.getPoll(poll.id)).toMatchObject({ status: "closed", counted: false });
    must(service.countPoll(owner, poll.id, scheduled.countingKey ?? ""));
    expect(service.resultsFor(poll.id, "administrator")?.counts).toEqual({ for: 1, against: 0, abstain: 0 });
  });

  it("refuses to schedule without an opening date in the future, and takes a scheduling back", () => {
    const noDate = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, noDate.id, "a@example.com"));
    expect(service.schedulePoll(owner, noDate.id)).toEqual({ ok: false, error: "opens_past" });
    const poll = must(service.createPoll(owner, input({ opensAt: "2026-12-02T15:00:00.000Z" })));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    must(service.schedulePoll(owner, poll.id));
    expect(must(service.unschedulePoll(owner, poll.id)).status).toBe("draft");
    expect(service.unschedulePoll(owner, poll.id)).toEqual({ ok: false, error: "locked" });
  });

  it("closes as soon as the share of the roll that voted is reached, or the number of votes", () => {
    const { poll, tokens } = openedPoll({ rules: { afterVotes: null, turnoutPercent: 100, threshold: null } }, "a@example.com\nb@example.com");
    must(service.castBallot(tokens[0] ?? "", "for"));
    expect(service.getPoll(poll.id)?.status).toBe("open");
    must(service.castBallot(tokens[1] ?? "", "against"));
    expect(service.getPoll(poll.id)).toMatchObject({ status: "closed", counted: true });
    expect(service.history(owner, poll.id).some((h) => h.action === "closed_auto" && h.detail === "turnout")).toBe(true);
    const byCount = openedPoll({ rules: { afterVotes: 2, turnoutPercent: null, threshold: null } });
    must(service.castBallot(byCount.tokens[0] ?? "", "for"));
    must(service.castBallot(byCount.tokens[1] ?? "", "for"));
    expect(service.getPoll(byCount.poll.id)?.status).toBe("closed");
  });

  it("closes when an option has more than half of the roll", () => {
    const { poll, tokens } = openedPoll({ rules: { afterVotes: null, turnoutPercent: null, threshold: "majority" } }, "a@example.com\nb@example.com\nc@example.com\nd@example.com");
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.castBallot(tokens[1] ?? "", "for"));
    must(service.castBallot(tokens[2] ?? "", "against"));
    expect(service.getPoll(poll.id)?.status).toBe("open");
    must(service.castBallot(tokens[3] ?? "", "for"));
    expect(service.getPoll(poll.id)).toMatchObject({ status: "closed" });
    expect(service.resultsFor(poll.id, "administrator")?.counts).toEqual({ for: 3, against: 1, abstain: 0 });
  });

  it("lets a member change their vote on a sealed poll: the last ballot counts and turnout counts members, not ballots", () => {
    const poll = must(service.createPoll(owner, input({ encrypted: true, allowChange: true })));
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    const opened = must(service.openPoll(owner, poll.id));
    const [a, b] = tokensOf(poll.id);
    must(service.castBallot(a ?? "", "for"));
    must(service.castBallot(a ?? "", "against"));
    must(service.castBallot(a ?? "", "abstain"));
    must(service.castBallot(b ?? "", "for"));
    expect(service.resultsFor(poll.id, "administrator")).toMatchObject({ turnout: 2, counts: null });
    must(service.closePoll(owner, poll.id, opened.countingKey ?? ""));
    expect(service.resultsFor(poll.id, "administrator")?.counts).toEqual({ for: 1, against: 0, abstain: 1 });
    expect(service.ledger(poll.id)?.size).toBe(4);
  });

  it("does not let a member vote twice where changing a vote is not allowed", () => {
    const { tokens } = openedPoll();
    must(service.castBallot(tokens[0] ?? "", "for"));
    expect(service.castBallot(tokens[0] ?? "", "against")).toEqual({ ok: false, error: "already_voted" });
  });

  it("keeps the time zone of the organization, and refuses an unknown one", () => {
    expect(service.getSpace(owner.spaceId)?.timeZone).toBe("America/Toronto");
    must(service.updateSpace(owner, { name: "Maple", locale: "en", theme: "standard", timeZone: "Europe/Paris" }));
    expect(service.getSpace(owner.spaceId)?.timeZone).toBe("Europe/Paris");
    expect(service.updateSpace(owner, { name: "Maple", locale: "en", theme: "standard", timeZone: "Mars/Olympus" })).toEqual({ ok: false, error: "invalid_time_zone" });
  });
});

describe("poll content in several languages", () => {
  const two = (over: Partial<PollInput> = {}) =>
    input({
      kind: "choice",
      title: "Quelle couleur?",
      question: "Laquelle?",
      options: opts("Vert", "Bleu"),
      translations: { languages: ["fr", "en"], title: { fr: "Quelle couleur?", en: "Which colour?" }, question: { fr: "Laquelle?", en: "Which one?" }, description: { fr: "", en: "" }, options: [{ fr: "Vert", en: "Green" }, { fr: "Bleu", en: "Blue" }] },
      ...over,
    });

  it("stores the content in each language and gives it back", () => {
    const poll = must(service.createPoll(owner, two()));
    expect(poll.translations.languages).toEqual(["fr", "en"]);
    expect(poll.translations.title.en).toBe("Which colour?");
    expect(service.getPoll(poll.id)?.translations.options[1]).toEqual({ fr: "Bleu", en: "Blue" });
  });

  it("refuses a poll with something missing in an offered language", () => {
    const base = two();
    expect(service.createPoll(owner, two({ translations: { ...base.translations, title: { fr: "Quelle couleur?", en: " " } } }))).toEqual({ ok: false, error: "translation_missing" });
    expect(service.createPoll(owner, two({ translations: { ...base.translations, options: [{ fr: "Vert", en: "Green" }, { fr: "Bleu" }] } }))).toEqual({ ok: false, error: "translation_missing" });
  });

  it("does not ask for anything more when the poll has one language", () => {
    expect(service.createPoll(owner, two({ translations: { languages: ["fr"], title: { fr: "Quelle couleur?" }, question: { fr: "Laquelle?" }, description: {}, options: [{ fr: "Vert" }, { fr: "Bleu" }] } })).ok).toBe(true);
    expect(service.createPoll(owner, input()).ok).toBe(true);
  });
});

describe("cancelling and named answers", () => {
  it("cancels an open poll: the ballots are erased, nobody sees results, nobody can vote", () => {
    const { poll, tokens } = openedPoll({ timing: "live", audience: "anyone" });
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.cancelPoll(owner, poll.id));
    expect(service.getPoll(poll.id)?.status).toBe("cancelled");
    for (const viewer of ["administrator", "voter", "anyone"] as const) expect(service.resultsFor(poll.id, viewer)).toBeNull();
    expect(service.castBallot(tokens[1] ?? "", "for")).toEqual({ ok: false, error: "cancelled" });
    expect(service.ledger(poll.id)).toBeNull();
    expect(service.history(owner, poll.id).some((h) => h.action === "cancelled")).toBe(true);
    expect(service.cancelPoll(owner, poll.id)).toEqual({ ok: false, error: "locked" });
  });

  it("cannot cancel a poll whose results are published, but can one that waits for its count", () => {
    const done = openedPoll();
    must(service.closePoll(owner, done.poll.id));
    expect(service.cancelPoll(owner, done.poll.id)).toEqual({ ok: false, error: "locked" });
    const draft = must(service.createPoll(owner, input()));
    expect(service.cancelPoll(owner, draft.id)).toEqual({ ok: false, error: "locked" });
    const sealed = must(service.createPoll(owner, input({ encrypted: true, closesAt: "2026-12-01T16:00:00.000Z" })));
    must(service.addToRoll(owner, sealed.id, "a@example.com"));
    must(service.openPoll(owner, sealed.id));
    now = new Date("2026-12-01T16:30:00Z");
    expect(service.getPoll(sealed.id)).toMatchObject({ status: "closed", counted: false });
    must(service.cancelPoll(owner, sealed.id));
    expect(service.getPoll(sealed.id)?.status).toBe("cancelled");
  });

  it("shows who answered what in a named poll to those who see the results, with addresses hidden from the public", () => {
    const { poll, tokens } = openedPoll({ anonymity: "named", timing: "live", audience: "anyone" }, "marie@example.org\njean@example.org");
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.castBallot(tokens[1] ?? "", "against"));
    expect(service.resultsFor(poll.id, "administrator")?.answers).toEqual([{ who: "marie@example.org", choice: "for", answers: { q1: "for" } }, { who: "jean@example.org", choice: "against", answers: { q1: "against" } }]);
    expect(service.resultsFor(poll.id, "voter")?.answers?.[0]?.who).toBe("marie@example.org");
    expect(service.resultsFor(poll.id, "anyone")?.answers).toEqual([{ who: "m***@e***.org", choice: "for", answers: { q1: "for" } }, { who: "j***@e***.org", choice: "against", answers: { q1: "against" } }]);
  });

  it("shows nobody's answer in a secret poll, and keeps no link to the voter", () => {
    const db = new DatabaseSync(":memory:");
    const svc = new Service(db, { secret: new Uint8Array(32).fill(5) });
    const o = svc.session(svc.signIn(must(svc.createSpace({ name: "S", locale: "en" })).key) ?? "") as Session;
    const p = must(svc.createPoll(o, input({ timing: "live", audience: "anyone" })));
    must(svc.addToRoll(o, p.id, "a@example.com"));
    must(svc.openPoll(o, p.id));
    must(svc.castBallot([...svc.voterTokens(o, p.id).values()][0] ?? "", "for"));
    expect(svc.resultsFor(p.id, "administrator")?.answers).toBeNull();
    expect(db.prepare("SELECT roll_id, voter_tag FROM ballots").get()).toEqual({ roll_id: null, voter_tag: null });
  });

  it("hides the answers of a named, sealed poll until the count, and counts only each member's last one", () => {
    const poll = must(service.createPoll(owner, input({ anonymity: "named", encrypted: true, allowChange: true, audience: "voters" })));
    must(service.addToRoll(owner, poll.id, "marie@example.org"));
    const opened = must(service.openPoll(owner, poll.id));
    const [t] = [...service.voterTokens(owner, poll.id).values()];
    must(service.castBallot(t ?? "", "for"));
    must(service.castBallot(t ?? "", "against"));
    expect(service.resultsFor(poll.id, "administrator")?.answers).toBeNull();
    must(service.closePoll(owner, poll.id, opened.countingKey ?? ""));
    expect(service.resultsFor(poll.id, "voter")?.answers).toEqual([{ who: "marie@example.org", choice: "against", answers: { q1: "against" } }]);
  });

  it("writes an address with most of it hidden", () => {
    expect(maskAddress("marie.tremblay@example.org")).toBe("m***@e***.org");
    expect(maskAddress("a@b.co")).toBe("a***@b***.co");
    expect(maskAddress("nonsense")).toBe("***");
  });
});

describe("a count that anyone can check", () => {
  function transparentPoll(over: Partial<PollInput> = {}) {
    const poll = must(service.createPoll(owner, input({ encrypted: true, publishCount: true, audience: "anyone", ...over })));
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com\nc@example.com"));
    const opened = must(service.openPoll(owner, poll.id));
    return { poll, key: opened.countingKey ?? "", tokens: [...service.voterTokens(owner, poll.id).values()] };
  }

  it("publishes every ballot with its receipt and its choice, and the counting key, to those who see the results, after the count", () => {
    const { poll, key, tokens } = transparentPoll();
    const receipts = [must(service.castBallot(tokens[0] ?? "", "for")).receipt, must(service.castBallot(tokens[1] ?? "", "against")).receipt];
    expect(service.publication(poll.id, "anyone")).toBeNull(); // open
    must(service.closePoll(owner, poll.id, key));
    const pub = service.publication(poll.id, "anyone");
    expect(pub?.countingKey?.replace(/\W/g, "")).toBe(key.replace(/\W/g, ""));
    expect(pub?.ballots.map((b) => [b.receipt, b.choice]).sort()).toEqual([[receipts[0], "for"], [receipts[1], "against"]].sort());
    expect(pub?.root).toBe(service.ledger(poll.id)?.root);
  });

  it("lets anyone recount: the published key opens the entries of the ledger to the listed choices", async () => {
    const { open: openSealed } = await import("./seal.js");
    const { poll, key, tokens } = transparentPoll();
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.castBallot(tokens[1] ?? "", "abstain"));
    must(service.closePoll(owner, poll.id, key));
    const pub = service.publication(poll.id, "anyone");
    const entries = service.ledgerEntries(poll.id, "anyone") ?? [];
    const opened = entries.map((e) => ({ receipt: e.receipt, choice: openSealed(pub?.countingKey ?? "", (JSON.parse(e.entry) as { sealed: string }).sealed) }));
    expect(opened.map((o) => o.choice).sort()).toEqual(["abstain", "for"]);
    for (const b of pub?.ballots ?? []) expect(opened.find((o) => o.receipt === b.receipt)?.choice).toBe(b.choice);
  });

  it("publishes nothing when the poll does not publish its count, and nothing to someone who may not see the results", () => {
    const quiet = transparentPoll({ publishCount: false });
    must(service.castBallot(quiet.tokens[0] ?? "", "for"));
    must(service.closePoll(owner, quiet.poll.id, quiet.key));
    expect(service.publication(quiet.poll.id, "anyone")).toBeNull();
    const closed = transparentPoll({ audience: "administrators" });
    must(service.castBallot(closed.tokens[0] ?? "", "for"));
    must(service.closePoll(owner, closed.poll.id, closed.key));
    expect(service.publication(closed.poll.id, "anyone")).toBeNull();
    expect(service.publication(closed.poll.id, "administrator")).not.toBeNull();
  });

  it("keeps the counting key out of the database unless the poll publishes its count", () => {
    const db = new DatabaseSync(":memory:");
    const svc = new Service(db, { secret: new Uint8Array(32).fill(9), now: () => now });
    const o = svc.session(svc.signIn(must(svc.createSpace({ name: "S", locale: "en" })).key) ?? "") as Session;
    const p = must(svc.createPoll(o, input({ encrypted: true })));
    must(svc.addToRoll(o, p.id, "a@example.com"));
    const opened = must(svc.openPoll(o, p.id));
    must(svc.closePoll(o, p.id, opened.countingKey ?? ""));
    expect(db.prepare("SELECT published_key AS k FROM polls").get()).toEqual({ k: null });
  });

  it("forbids cancelling once voting has begun, when the poll asks for it, and says how many ballots had been cast when it is cancelled", () => {
    const locked = transparentPoll({ lockCancel: true });
    expect(service.cancelPoll(owner, locked.poll.id).ok).toBe(true); // no ballot yet
    const locked2 = transparentPoll({ lockCancel: true });
    must(service.castBallot(locked2.tokens[0] ?? "", "for"));
    expect(service.cancelPoll(owner, locked2.poll.id)).toEqual({ ok: false, error: "cancel_locked" });
    const free = transparentPoll();
    must(service.castBallot(free.tokens[0] ?? "", "for"));
    must(service.castBallot(free.tokens[1] ?? "", "against"));
    const cancelled = must(service.cancelPoll(owner, free.poll.id));
    expect(cancelled.cancelled).toEqual({ by: "Owner", ballots: 2 });
  });
});

describe("reminders", () => {
  it("allows a reminder only a day after the last message, and says when", () => {
    const { poll } = openedPoll();
    const first = service.invitees(owner, poll.id, "new");
    expect(first).toHaveLength(3);
    service.markInvited(owner, poll.id, first.map((e) => e.id));
    expect(service.invitees(owner, poll.id, "new")).toEqual([]);
    expect(service.invitees(owner, poll.id, "reminder")).toEqual([]);
    expect(service.invitees(owner, poll.id, first[0]?.id ?? 0)).toEqual([]);
    expect(service.reminderWait(owner, poll.id)?.toISOString()).toBe("2026-12-02T15:00:00.000Z");
    now = new Date("2026-12-02T15:00:01Z");
    expect(service.invitees(owner, poll.id, "reminder")).toHaveLength(3);
    expect(service.reminderWait(owner, poll.id)).toBeNull();
  });

  it("leaves out participants who voted, and those never written to", () => {
    const { poll, tokens } = openedPoll();
    const all = service.invitees(owner, poll.id, "new");
    service.markInvited(owner, poll.id, [all[0]?.id ?? 0, all[1]?.id ?? 0]);
    must(service.castBallot(tokens[0] ?? "", "for"));
    now = new Date("2026-12-02T16:00:00Z");
    expect(service.invitees(owner, poll.id, "reminder").map((e) => e.address)).toEqual(["b@example.com"]);
  });

  it("sends the automatic reminder of a poll that asks for one, once a day from 9 a.m., to those written to a day before", () => {
    const poll = must(service.createPoll(owner, input({ autoReminder: "daily", reminderPermission: true })));
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    must(service.openPoll(owner, poll.id));
    service.markInvited(owner, poll.id, service.invitees(owner, poll.id, "new").map((e) => e.id));
    // 10 a.m. in Toronto: the day's reminder is due, but everyone was written to a moment ago, so nobody receives it.
    expect(service.dueReminders().map((d) => d.targets)).toEqual([[]]);
    service.markAutoReminded(poll.id, [], "2026-12-01");
    now = new Date("2026-12-02T15:30:00Z"); // 10:30 a.m. the next day, more than a day after the first message
    const due = service.dueReminders();
    expect(due).toHaveLength(1);
    expect(due[0]?.targets.map((t) => t.address)).toEqual(["a@example.com", "b@example.com"]);
    service.markAutoReminded(poll.id, due[0]?.targets.map((t) => t.id) ?? [], "2026-12-02");
    expect(service.dueReminders()).toEqual([]);
    expect(service.history(owner, poll.id).some((h) => h.action === "reminder_sent" && h.actor === "automatic")).toBe(true);
  });

  it("refuses automatic reminders without the confirmation of permission", () => {
    expect(service.createPoll(owner, input({ autoReminder: "daily", reminderPermission: false }))).toEqual({ ok: false, error: "attestation_required" });
    expect(service.createPoll(owner, input({ autoReminder: "none" })).ok).toBe(true);
  });
});

describe("sending links", () => {
  it("offers the members who have not voted and not been sent a link, and remembers who was sent one", () => {
    const { poll, tokens } = openedPoll();
    must(service.castBallot(tokens[0] ?? "", "for"));
    const first = service.invitees(owner, poll.id, "new");
    expect(first.map((e) => e.address)).toEqual(["b@example.com", "c@example.com"]);
    expect(first[0]?.token).toBe(tokens[1]);
    service.markInvited(owner, poll.id, [first[0]?.id ?? 0]);
    expect(service.invitees(owner, poll.id, "new").map((e) => e.address)).toEqual(["c@example.com"]);
    expect(service.invitees(owner, poll.id, "reminder").map((e) => e.address)).toEqual([]);
    expect(service.invitees(owner, poll.id, first[0]?.id ?? 0)).toEqual([]);
    expect(service.roll(owner, poll.id).find((e) => e.address === "b@example.com")?.invitedOn).toBe("2026-12-01");
    expect(service.history(owner, poll.id).some((h) => h.action === "links_sent" && h.detail === "1")).toBe(true);
  });

  it("offers nobody before the poll is open or after it closes, or to another organization", () => {
    const draft = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, draft.id, "a@example.com"));
    expect(service.invitees(owner, draft.id, "new")).toEqual([]);
    const { poll } = openedPoll();
    const other = service.session(service.signIn(must(service.createSpace({ name: "Other", locale: "en" })).key) ?? "") as Session;
    expect(service.invitees(other, poll.id, "new")).toEqual([]);
    must(service.closePoll(owner, poll.id));
    expect(service.invitees(owner, poll.id, "new")).toEqual([]);
  });
});

describe("approvals between administrators", () => {
  function second(label = "Clerk"): Session {
    const key = must(service.createKey(owner, { label, owner: false, administrator: true }));
    return service.session(service.signIn(key.key) ?? "") as Session;
  }
  const rule = (rule: "majority" | "all", over: Partial<{ abstention: "agreement" | "disagreement" | "neutral" | "discarded"; delayHours: number }> = {}) =>
    service.setApprovalPolicy(owner, { rule, abstention: "neutral", delayHours: 168, ...over });
  function draft(over: Partial<PollInput> = {}) {
    const poll = must(service.createPoll(owner, input(over)));
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    return poll;
  }

  it("needs nothing with one administrator, and records who published", () => {
    must(rule("all"));
    expect(service.approvalRequired(owner.spaceId)).toBe(false);
    const poll = draft();
    must(service.openPoll(owner, poll.id));
    expect(service.getPoll(poll.id)?.approval).toMatchObject({ rule: "all", approvals: 1, eligible: 1 });
  });

  it("holds a draft until the other administrator approves the exact content", () => {
    const clerk = second();
    must(rule("all"));
    const poll = draft();
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    const asked = must(service.requestPublication(owner, poll.id)).request;
    expect(asked).toMatchObject({ status: "pending", tally: { approvals: 1, needed: 2 } });
    expect(service.pollApprovalState(owner, poll.id).state).toBe("pending");
    expect(service.approvalsWaiting(clerk)).toBe(1);
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    const answered = must(service.answerApproval(clerk, asked?.id ?? "", "approve", asked?.digest ?? ""));
    expect(answered.status).toBe("approved");
    expect(service.pollApprovalState(owner, poll.id).state).toBe("approved");
    must(service.openPoll(owner, poll.id));
    expect(service.getPoll(poll.id)?.approval).toMatchObject({ rule: "all", approvals: 2, eligible: 2, digest: asked?.digest });
  });

  it("voids the approval when the draft changes, says what changed, and refuses answers from a stale view", () => {
    const clerk = second();
    must(rule("all"));
    const poll = draft();
    const asked = must(service.requestPublication(owner, poll.id)).request;
    must(service.updatePoll(owner, poll.id, input({ title: "Budget 2028" })));
    const state = service.pollApprovalState(owner, poll.id);
    expect(state.state).toBe("stale");
    expect(state.changes).toEqual(["title"]);
    expect(service.answerApproval(clerk, asked?.id ?? "", "approve", asked?.digest ?? "")).toEqual({ ok: false, error: "approval_stale" });
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    must(service.addToRoll(owner, poll.id, "c@example.com"));
    expect(service.pollApprovalState(owner, poll.id).changes).toEqual(["title", "roll"]);
  });

  it("voids an approved request too when the draft changes afterwards", () => {
    const clerk = second();
    must(rule("all"));
    const poll = draft();
    const asked = must(service.requestPublication(owner, poll.id)).request;
    must(service.answerApproval(clerk, asked?.id ?? "", "approve", asked?.digest ?? ""));
    must(service.addToRoll(owner, poll.id, "c@example.com"));
    expect(service.pollApprovalState(owner, poll.id).state).toBe("stale");
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    const again = must(service.requestPublication(owner, poll.id)).request;
    must(service.answerApproval(clerk, again?.id ?? "", "approve", again?.digest ?? ""));
    must(service.openPoll(owner, poll.id));
  });

  it("rejects, and lapses after its delay", () => {
    const clerk = second();
    must(rule("all", { delayHours: 2 }));
    const poll = draft();
    const asked = must(service.requestPublication(owner, poll.id)).request;
    expect(must(service.answerApproval(clerk, asked?.id ?? "", "reject", asked?.digest ?? "")).status).toBe("rejected");
    const next = must(service.requestPublication(owner, poll.id)).request;
    now = new Date(now.getTime() + 3 * 3_600_000);
    expect(service.pollApprovalState(owner, poll.id)).toMatchObject({ state: "lapsed", request: { id: next?.id } });
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
  });

  it("counts an abstention as the organization decided", () => {
    const clerk = second();
    must(rule("all", { abstention: "agreement" }));
    const poll = draft();
    const asked = must(service.requestPublication(owner, poll.id)).request;
    expect(must(service.answerApproval(clerk, asked?.id ?? "", "abstain", asked?.digest ?? "")).status).toBe("approved");
  });

  it("makes the rule itself a request once it applies: one administrator cannot lower it", () => {
    const clerk = second();
    must(rule("all"));
    const lowered = must(service.setApprovalPolicy(owner, { rule: "none", abstention: "neutral", delayHours: 168 })).request;
    expect(lowered).toMatchObject({ kind: "set_policy", status: "pending" });
    expect(service.approvalPolicy(owner.spaceId).rule).toBe("all");
    must(service.answerApproval(clerk, lowered?.id ?? "", "approve", lowered?.digest ?? ""));
    expect(service.approvalPolicy(owner.spaceId).rule).toBe("none");
  });

  it("sends a change of the name through approval, and keeps the old name until then", () => {
    const clerk = second();
    must(rule("majority"));
    const changed = must(service.updateSpace(owner, { name: "Renamed", locale: "en", theme: "ballot-paper" as never, timeZone: "America/Toronto" }));
    expect(changed.name).toBe("Maple Court Association");
    expect(changed.request).toMatchObject({ kind: "space_settings", status: "pending" });
    must(service.answerApproval(clerk, changed.request?.id ?? "", "approve", changed.request?.digest ?? ""));
    expect(service.getSpace(owner.spaceId)?.name).toBe("Renamed");
  });

  it("only lets administrators answer", () => {
    second();
    const ownerOnly = must(service.createKey(owner, { label: "Board", owner: true, administrator: false }));
    const board = service.session(service.signIn(ownerOnly.key) ?? "") as Session;
    must(rule("all"));
    const poll = draft();
    const asked = must(service.requestPublication(owner, poll.id)).request;
    expect(service.answerApproval(board, asked?.id ?? "", "approve", asked?.digest ?? "")).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("actions that need a permit once approvals apply", () => {
  function setup(abstention: "neutral" | "agreement" = "neutral") {
    const key = must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    const clerk = service.session(service.signIn(key.key) ?? "") as Session;
    must(service.setApprovalPolicy(owner, { rule: "all", abstention, delayHours: 168 }));
    return clerk;
  }
  const approve = (clerk: Session, request: { id: string; digest: string } | null | undefined) => must(service.answerApproval(clerk, request?.id ?? "", "approve", request?.digest ?? ""));
  function published(clerk: Session, over: Partial<PollInput> = {}) {
    const poll = must(service.createPoll(owner, input(over)));
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    const asked = must(service.requestPublication(owner, poll.id)).request;
    approve(clerk, asked);
    return poll;
  }

  it("closes by hand only with a permit, which is used up", () => {
    const clerk = setup();
    const poll = published(clerk);
    must(service.openPoll(owner, poll.id));
    expect(service.closePoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    expect(service.actionApprovalState(owner, "close_poll", poll.id).state).toBe("none");
    const asked = must(service.requestAction(owner, "close_poll", poll.id)).request;
    expect(service.actionApprovalState(owner, "close_poll", poll.id).state).toBe("pending");
    approve(clerk, asked);
    expect(service.actionApprovalState(owner, "close_poll", poll.id).state).toBe("approved");
    must(service.closePoll(owner, poll.id));
    expect(service.actionApprovalState(owner, "close_poll", poll.id).state).toBe("none");
  });

  it("closes at the deadline without asking", () => {
    const clerk = setup();
    const poll = published(clerk, { closesAt: "2026-12-02T15:00:00.000Z" });
    must(service.openPoll(owner, poll.id));
    now = new Date("2026-12-02T15:00:01Z");
    expect(service.getPoll(poll.id)?.status).toBe("closed");
  });

  it("cancels only with a permit", () => {
    const clerk = setup();
    const poll = published(clerk);
    must(service.openPoll(owner, poll.id));
    expect(service.cancelPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    approve(clerk, must(service.requestAction(owner, "cancel_poll", poll.id)).request);
    expect(must(service.cancelPoll(owner, poll.id)).status).toBe("cancelled");
  });

  it("adds people to an open poll only with a permit for exactly those addresses", () => {
    const clerk = setup();
    const poll = published(clerk, { lateRoll: true });
    must(service.openPoll(owner, poll.id));
    expect(service.addToRoll(owner, poll.id, "late@example.com")).toEqual({ ok: false, error: "approval_required" });
    approve(clerk, must(service.requestAction(owner, "add_roll", poll.id, ["late@example.com"])).request);
    expect(service.addToRoll(owner, poll.id, "other@example.com")).toEqual({ ok: false, error: "approval_required" });
    expect(must(service.addToRoll(owner, poll.id, "Late@example.com")).added).toBe(1);
    expect(service.addToRoll(owner, poll.id, "late2@example.com")).toEqual({ ok: false, error: "approval_required" });
  });

  it("creates a key only for the label and roles that were approved, and revokes only with a permit", () => {
    const clerk = setup();
    const detail = { label: "Auditor", owner: false, administrator: true };
    expect(service.createKey(owner, detail)).toEqual({ ok: false, error: "approval_required" });
    approve(clerk, must(service.requestAction(owner, "add_key", "", detail)).request);
    expect(service.createKey(owner, { ...detail, label: "Someone else" })).toEqual({ ok: false, error: "approval_required" });
    must(service.createKey(owner, detail));
    const target = service.listKeys(owner).find((k) => k.label === "Clerk");
    expect(service.revokeKey(owner, target?.id ?? "")).toEqual({ ok: false, error: "approval_required" });
  });

  it("does not let a key made after a request answer it", () => {
    const clerk = setup();
    const poll = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    const asked = must(service.requestPublication(owner, poll.id)).request;
    // A second key held by the owner is added with the approval of the clerk, after the request was made.
    const detail = { label: "Second key", owner: false, administrator: true };
    approve(clerk, must(service.requestAction(owner, "add_key", "", detail)).request);
    const extra = must(service.createKey(owner, detail));
    const extraSession = service.session(service.signIn(extra.key) ?? "") as Session;
    expect(service.answerApproval(extraSession, asked?.id ?? "", "approve", asked?.digest ?? "")).toEqual({ ok: false, error: "forbidden" });
    expect(service.pollApprovalState(owner, poll.id).state).toBe("pending");
  });

  it("keeps the rule a request was made under when the rule changes", () => {
    const clerk = setup();
    const poll = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    const asked = must(service.requestPublication(owner, poll.id)).request;
    const lowered = must(service.setApprovalPolicy(owner, { rule: "none", abstention: "neutral", delayHours: 168 })).request;
    approve(clerk, lowered);
    expect(service.approvalPolicy(owner.spaceId).rule).toBe("none");
    // The open request keeps its own rule, and can still be answered.
    expect(service.approvalRequests(owner).open.map((r) => r.id)).toContain(asked?.id);
    expect(service.approvalRequests(owner).open.find((r) => r.id === asked?.id)?.policy.rule).toBe("all");
  });

  it("asks for approval again to open a scheduled poll early, and clears the approval on unscheduling", () => {
    const clerk = setup();
    const poll = must(service.createPoll(owner, input({ opensAt: "2026-12-03T15:00:00.000Z", closesAt: "2026-12-09T15:00:00.000Z" })));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    expect(service.schedulePoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    approve(clerk, must(service.requestPublication(owner, poll.id)).request);
    must(service.schedulePoll(owner, poll.id));
    expect(service.getPoll(poll.id)?.approval).toMatchObject({ approvals: 2 });
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
    must(service.unschedulePoll(owner, poll.id));
    expect(service.getPoll(poll.id)?.approval).toBeNull();
    must(service.updatePoll(owner, poll.id, input({ title: "Renamed", opensAt: "2026-12-03T15:00:00.000Z", closesAt: "2026-12-09T15:00:00.000Z" })));
    // The old approval was used up when the poll was scheduled, so a new request is needed.
    expect(service.pollApprovalState(owner, poll.id).state).toBe("none");
    expect(service.schedulePoll(owner, poll.id)).toEqual({ ok: false, error: "approval_required" });
  });
});

describe("several questions in one poll (ADR 0010)", () => {
  const extra = (prompt: string, labels: string[] = []) => ({ type: labels.length > 0 ? ("single" as const) : ("yes-no" as const), prompt, options: labels.map((label) => ({ label, icon: null, color: null })) });
  const multi = (over: Partial<PollInput> = {}) =>
    input({ extraQuestions: [extra("Elect the chair?", ["Ana", "Ben", "Chloe"]), extra("Adopt the by-laws?")], ...over });
  function open(over: Partial<PollInput> = {}, addresses = "a@example.com\nb@example.com\nc@example.com") {
    const poll = must(service.createPoll(owner, multi(over)));
    must(service.addToRoll(owner, poll.id, addresses));
    const opened = must(service.openPoll(owner, poll.id));
    return { poll, key: opened.countingKey ?? "", tokens: [...service.voterTokens(owner, poll.id).values()] };
  }

  it("reads a poll of one question as a list of one, and keeps its own columns", () => {
    const poll = must(service.createPoll(owner, input()));
    expect(poll.questions).toHaveLength(1);
    expect(poll.questions[0]).toMatchObject({ id: "q1", type: "yes-no", prompt: poll.question });
  });

  it("stores several questions with their own options, and question 1 stays the poll's first", () => {
    const poll = must(service.createPoll(owner, multi()));
    expect(poll.questions.map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
    expect(poll.questions[1]?.options.map((o) => o.label)).toEqual(["Ana", "Ben", "Chloe"]);
    expect(poll.question).toBe("Do you adopt the budget of $12,400 for 2027?");
    expect(poll.options.map((o) => o.id)).toEqual(["for", "against", "abstain"]);
  });

  it("can go back to one question, which empties the question list again", () => {
    const poll = must(service.createPoll(owner, multi()));
    expect(must(service.updatePoll(owner, poll.id, input())).questions).toHaveLength(1);
  });

  it("refuses too many questions, too many options in all, a missing question text, and a threshold rule", () => {
    const many = Array.from({ length: 20 }, (_, i) => extra(`Question ${i + 2}?`));
    expect(service.createPoll(owner, input({ extraQuestions: many }))).toEqual({ ok: false, error: "questions_too_many" });
    const wide = Array.from({ length: 12 }, (_, i) => extra(`Q${i + 2}?`, Array.from({ length: 12 }, (_, j) => `Option ${j + 1}`)));
    expect(service.createPoll(owner, input({ extraQuestions: wide }))).toEqual({ ok: false, error: "options_too_many_total" });
    expect(service.createPoll(owner, input({ extraQuestions: [extra("  ")] }))).toEqual({ ok: false, error: "question_required" });
    expect(service.createPoll(owner, multi({ rules: { ...NO_RULES, threshold: "majority" } }))).toEqual({ ok: false, error: "rules_need_one_question" });
  });

  it("takes a ballot with one answer for every question, and refuses the rest", () => {
    const { poll, tokens } = open();
    expect(service.castBallot(tokens[0] ?? "", "for")).toEqual({ ok: false, error: "answers_incomplete" });
    expect(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o1" })).toMatchObject({ ok: false });
    expect(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o9", q3: "for" })).toEqual({ ok: false, error: expect.any(String), question: "q2" });
    expect(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o1", q3: "for", q9: "x" })).toEqual({ ok: false, error: "unknown_question", question: "q9" });
    must(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o2", q3: "against" }));
    expect(service.getPoll(poll.id)?.status).toBe("open");
  });

  it("counts each question on its own, and shows turnout in members", () => {
    const { poll, tokens } = open({ timing: "live", audience: "voters" });
    must(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o1", q3: "for" }));
    must(service.castBallot(tokens[1] ?? "", { q1: "against", q2: "o1", q3: "for" }));
    const view = service.resultsFor(poll.id, "voter");
    expect(view?.turnout).toBe(2);
    expect(view?.questions?.map((q) => q.counts)).toEqual([
      { for: 1, against: 1, abstain: 0 },
      { o1: 2, o2: 0, o3: 0 },
      { for: 2, against: 0, abstain: 0 },
    ]);
    expect(view?.counts).toEqual({ for: 1, against: 1, abstain: 0 });
  });

  it("seals and counts a poll of several questions, with every ciphertext the same length", () => {
    const { poll, key, tokens } = open({ encrypted: true, publishCount: true });
    must(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o3", q3: "abstain" }));
    must(service.castBallot(tokens[1] ?? "", { q1: "against", q2: "o1", q3: "for" }));
    expect(service.resultsFor(poll.id, "administrator")?.questions).toBeNull();
    must(service.closePoll(owner, poll.id, key));
    expect(service.resultsFor(poll.id, "administrator")?.questions?.map((q) => q.counts)).toEqual([
      { for: 1, against: 1, abstain: 0 },
      { o1: 1, o2: 0, o3: 1 },
      { for: 1, against: 0, abstain: 1 },
    ]);
    const sizes = new Set((service.ledgerEntries(poll.id, "administrator") ?? []).map((e) => (JSON.parse(e.entry) as { sealed: string }).sealed.length));
    expect(sizes.size).toBe(1);
  });

  it("gives a named poll's answers for every question", () => {
    const { poll, tokens } = open({ anonymity: "named", timing: "live" });
    must(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o2", q3: "against" }));
    expect(service.resultsFor(poll.id, "administrator")?.answers?.[0]?.answers).toEqual({ q1: "for", q2: "o2", q3: "against" });
  });

  it("cancelling erases every answer", () => {
    const { poll, tokens } = open();
    must(service.castBallot(tokens[0] ?? "", { q1: "for", q2: "o2", q3: "against" }));
    must(service.cancelPoll(owner, poll.id));
    expect(service.resultsFor(poll.id, "administrator")).toBeNull();
  });

  it("keeps the digest of a poll of one question, and changes it when a later question changes", () => {
    const one = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, one.id, "a@example.com"));
    const before = service.pollApprovalState(owner, one.id).digest;
    const poll = must(service.createPoll(owner, multi()));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    const d1 = service.pollApprovalState(owner, poll.id).digest;
    must(service.updatePoll(owner, poll.id, multi({ extraQuestions: [extra("Elect the chair?", ["Ana", "Ben", "Dana"]), extra("Adopt the by-laws?")] })));
    expect(service.pollApprovalState(owner, poll.id).digest).not.toBe(d1);
    expect(before).toBe(service.pollApprovalState(owner, one.id).digest);
  });

});

describe("confirming the organization's details", () => {
  it("lets each administrator confirm the record, and a change clears every confirmation", () => {
    const key = must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    const clerk = service.session(service.signIn(key.key) ?? "") as Session;
    const before = service.setupStatus(owner.spaceId);
    expect(before?.administrators.every((a) => !a.confirmed)).toBe(true);
    const confirmed = must(service.confirmSetup(owner, before?.digest ?? ""));
    expect(confirmed.administrators.filter((a) => a.confirmed).map((a) => a.label)).toEqual(["Owner"]);
    must(service.confirmSetup(clerk, confirmed.digest));
    expect(service.setupStatus(owner.spaceId)?.administrators.every((a) => a.confirmed)).toBe(true);
    must(service.updateSpace(owner, { name: "Renamed", locale: "en", theme: "ballot-paper" as never, timeZone: "America/Toronto" }));
    expect(service.setupStatus(owner.spaceId)?.administrators.some((a) => a.confirmed)).toBe(false);
  });

  it("refuses a confirmation of a record that changed since it was shown, and one from a non-administrator", () => {
    const status = service.setupStatus(owner.spaceId);
    must(service.updateSpace(owner, { name: "Changed", locale: "en", theme: "ballot-paper" as never, timeZone: "America/Toronto" }));
    expect(service.confirmSetup(owner, status?.digest ?? "")).toEqual({ ok: false, error: "approval_stale" });
    const board = must(service.createKey(owner, { label: "Board", owner: true, administrator: false }));
    const boardSession = service.session(service.signIn(board.key) ?? "") as Session;
    expect(service.confirmSetup(boardSession, service.setupStatus(owner.spaceId)?.digest ?? "")).toEqual({ ok: false, error: "forbidden" });
  });

  it("records how many had confirmed when a poll was published", () => {
    must(service.confirmSetup(owner, service.setupStatus(owner.spaceId)?.digest ?? ""));
    const poll = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    must(service.openPoll(owner, poll.id));
    expect(service.getPoll(poll.id)?.approval).toMatchObject({ confirmed: 1, eligible: 1 });
  });
});

describe("the record of governance events", () => {
  const kinds = (record: ReturnType<Service["governanceRecord"]>) => (record?.entries ?? []).map((e) => e.kind).reverse();

  it("records what happens, in order, with a root and a checkpoint", () => {
    const key = must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    expect(key.key).toMatch(/^QK-/);
    must(service.confirmSetup(owner, service.setupStatus(owner.spaceId)?.digest ?? ""));
    const record = service.governanceRecord(owner);
    expect(kinds(record)).toEqual(["space_created", "key_created", "setup_confirmed"]);
    expect(record).toMatchObject({ size: 3, intact: true, brokenAt: null });
    expect(record?.root).toMatch(/^[0-9a-f]{64}$/);
    expect(record?.checkpoint).toBe(`qohesion-record-v1\nspace ${owner.spaceId}\nsize 3\nroot ${record?.root}\n`);
    // A key's value is never in the record.
    expect(JSON.stringify(service.governanceDownload(owner))).not.toContain(key.key);
  });

  it("records requests, answers, decisions and publications", () => {
    const key = must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    const clerk = service.session(service.signIn(key.key) ?? "") as Session;
    must(service.setApprovalPolicy(owner, { rule: "all", abstention: "neutral", delayHours: 168 }));
    const poll = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    const asked = must(service.requestPublication(owner, poll.id)).request;
    must(service.answerApproval(clerk, asked?.id ?? "", "approve", asked?.digest ?? ""));
    must(service.openPoll(owner, poll.id));
    const seen = kinds(service.governanceRecord(owner));
    for (const kind of ["policy_changed", "request_created", "request_answered", "request_approved", "poll_published", "request_used"]) expect(seen).toContain(kind);
  });

  it("shows the chain broken at the first entry that was changed, and the root changes", () => {
    const db = new DatabaseSync(":memory:");
    const secret = new Uint8Array(32).fill(7);
    const svc = new Service(db, { secret, now: () => now });
    const created = must(svc.createSpace({ name: "Org", locale: "en" }));
    const session = svc.session(svc.signIn(created.key) ?? "") as Session;
    must(svc.createKey(session, { label: "A", owner: false, administrator: true }));
    must(svc.createKey(session, { label: "B", owner: false, administrator: true }));
    const before = svc.governanceRecord(session);
    expect(before?.intact).toBe(true);
    // Rewriting an earlier entry breaks the link that the next entry holds.
    const row = db.prepare("SELECT entry FROM governance_log WHERE seq = 1").get();
    db.prepare("UPDATE governance_log SET entry = ? WHERE seq = 1").run(String(row?.["entry"]).replace('"label":"A"', '"label":"Z"'));
    const after = svc.governanceRecord(session);
    expect(after).toMatchObject({ intact: false, brokenAt: 2 });
    expect(after?.root).not.toBe(before?.root);
    // Cutting the record from the end changes the size.
    db.prepare("DELETE FROM governance_log WHERE seq = 2").run();
    expect(svc.governanceRecord(session)?.size).toBe(2);
  });

  it("reads an organization that has no entries yet, as one made before the record existed", () => {
    const db = new DatabaseSync(":memory:");
    const svc = new Service(db, { secret: new Uint8Array(32).fill(7), now: () => now });
    const created = must(svc.createSpace({ name: "Old", locale: "en" }));
    const session = svc.session(svc.signIn(created.key) ?? "") as Session;
    db.prepare("DELETE FROM governance_log").run();
    expect(svc.governanceRecord(session)).toMatchObject({ size: 0, intact: true, entries: [] });
    must(svc.createKey(session, { label: "A", owner: false, administrator: true }));
    expect(svc.governanceRecord(session)).toMatchObject({ size: 1, intact: true });
  });

  it("is for administrators and owners only", () => {
    expect(service.governanceRecord({ ...owner, owner: false, administrator: false })).toBeNull();
  });
});

describe("the organization's name", () => {
  const rename = (name: string) => service.updateSpace(owner, { name, locale: "en", theme: "ballot-paper" as never, timeZone: "America/Toronto" });

  it("can change while no poll is scheduled or open", () => {
    expect(must(rename("New Name")).name).toBe("New Name");
  });

  it("is fixed while a poll is open, and a poll keeps the name it was published under", () => {
    const { poll } = openedPoll();
    expect(rename("Other Name")).toEqual({ ok: false, error: "name_locked" });
    expect(service.nameLocked(owner.spaceId)).toBe(true);
    must(service.closePoll(owner, poll.id));
    expect(service.nameLocked(owner.spaceId)).toBe(false);
    must(rename("Other Name"));
    expect(service.getPoll(poll.id)?.organization).toBe("Maple Court Association");
  });

  it("lets the other settings change while a poll is open", () => {
    openedPoll();
    expect(must(service.updateSpace(owner, { name: "Maple Court Association", locale: "fr", theme: "ballot-paper" as never, timeZone: "America/Toronto" })).locale).toBe("fr");
  });
});

describe("the roll as the administrator reads it", () => {
  it("keeps an address as typed, dots included, and still counts a Gmail address once", () => {
    const poll = must(service.createPoll(owner, input()));
    const r = must(service.addToRoll(owner, poll.id, "lkvm.studio@gmail.com\nlkvmstudio@gmail.com"));
    expect(r).toMatchObject({ added: 1, duplicates: 1 });
    expect(service.roll(owner, poll.id).map((e) => e.address)).toEqual(["lkvm.studio@gmail.com"]);
  });

  it("counts the links sent: the first day, the latest day, and how many in all", () => {
    const { poll } = openedPoll({}, "a@example.com");
    const id = service.roll(owner, poll.id)[0]?.id ?? 0;
    service.markInvited(owner, poll.id, [id]);
    now = new Date("2026-12-03T15:00:00Z");
    service.markInvited(owner, poll.id, [id]);
    expect(service.roll(owner, poll.id)[0]).toMatchObject({ invites: 2, firstInvitedOn: "2026-12-01", invitedOn: "2026-12-03" });
  });

  it("treats links sent before the exact moment was kept as sent, so a reminder is offered rather than a first link", () => {
    const db = new DatabaseSync(":memory:");
    const secret = new Uint8Array(32).fill(7);
    const first = new Service(db, { secret, now: () => now });
    const created = must(first.createSpace({ name: "Old Org", locale: "en" }));
    const session = first.session(first.signIn(created.key) ?? "") as Session;
    const poll = must(first.createPoll(session, input()));
    must(first.addToRoll(session, poll.id, "a@example.com"));
    must(first.openPoll(session, poll.id));
    db.exec("UPDATE roll SET invited_on = '2026-11-30', invited_at = NULL, invite_count = 0, first_invited_on = NULL");
    now = new Date("2026-12-02T15:00:00Z");
    const later = new Service(db, { secret, now: () => now });
    expect(later.invitees(session, poll.id, "new")).toHaveLength(0);
    expect(later.invitees(session, poll.id, "reminder")).toHaveLength(1);
    expect(later.roll(session, poll.id)[0]).toMatchObject({ invites: 1, firstInvitedOn: "2026-11-30" });
  });

  it("holds the people a message goes to, so that a second send finds nobody, and puts back those whose message failed", () => {
    const { poll } = openedPoll({}, "a@example.com\nb@example.com");
    const ids = service.roll(owner, poll.id).map((e) => e.id);
    const held = service.reserveInvites(poll.id, ids);
    expect(held).toHaveLength(2);
    expect(service.reserveInvites(poll.id, ids)).toHaveLength(0);
    expect(service.invitees(owner, poll.id, "reminder")).toHaveLength(0);
    service.releaseInvites(poll.id, held.filter((h) => h.id === ids[1]));
    expect(service.invitees(owner, poll.id, "new").map((e) => e.id)).toEqual([ids[1]]);
    expect(service.roll(owner, poll.id).find((e) => e.id === ids[1])).toMatchObject({ invites: 0, invitedOn: null });
    expect(service.roll(owner, poll.id).find((e) => e.id === ids[0])).toMatchObject({ invites: 1 });
  });

  it("counts the day of an automatic reminder as done unless every message failed", () => {
    const poll = must(service.createPoll(owner, input({ autoReminder: "daily", reminderPermission: true })));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    must(service.openPoll(owner, poll.id));
    service.markInvited(owner, poll.id, service.invitees(owner, poll.id, "new").map((e) => e.id));
    now = new Date("2026-12-02T15:30:00Z");
    const [due] = service.dueReminders();
    const ids = due?.targets.map((t) => t.id) ?? [];
    expect(ids).toHaveLength(1);
    // Every message failed: the entries are put back and the reminder is still due at the next check.
    const held = service.reserveInvites(poll.id, ids);
    service.releaseInvites(poll.id, held);
    service.finishAutoReminder(poll.id, 0, 1, "2026-12-02");
    expect(service.dueReminders()).toHaveLength(1);
    // One message went: the day is done.
    const again = service.reserveInvites(poll.id, ids);
    service.finishAutoReminder(poll.id, again.length, 0, "2026-12-02");
    expect(service.dueReminders()).toEqual([]);
  });

  it("refuses new participants after opening when the poll says the roll is fixed", () => {
    const fixed = openedPoll({ lateRoll: false }).poll;
    expect(service.addToRoll(owner, fixed.id, "late@example.com")).toEqual({ ok: false, error: "roll_locked" });
    const open = openedPoll({ lateRoll: true }).poll;
    expect(must(service.addToRoll(owner, open.id, "late@example.com")).added).toBe(1);
  });
});

describe("sealed ballots", () => {
  function sealedPoll(addresses = "a@example.com\nb@example.com\nc@example.com") {
    const poll = must(service.createPoll(owner, input({ encrypted: true })));
    must(service.addToRoll(owner, poll.id, addresses));
    const opened = must(service.openPoll(owner, poll.id));
    return { poll, key: opened.countingKey ?? "", tokens: [...service.voterTokens(owner, poll.id).values()] };
  }

  it("refuses sealed ballots with live results", () => {
    expect(service.createPoll(owner, input({ encrypted: true, timing: "live" }))).toEqual({ ok: false, error: "encryption_needs_close" });
  });

  it("gives the counting key at opening for a sealed poll, and none for an open one", () => {
    expect(sealedPoll().key).toMatch(/^QC-/);
    const plain = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, plain.id, "z@example.com"));
    expect(must(service.openPoll(owner, plain.id)).countingKey).toBeNull();
  });

  it("stores no readable choice before the count, and no plaintext in the ledger entry", () => {
    const db = new DatabaseSync(":memory:");
    const svc = new Service(db, { secret: new Uint8Array(32).fill(3) });
    const o = svc.session(svc.signIn(must(svc.createSpace({ name: "S", locale: "en" })).key) ?? "") as Session;
    const p = must(svc.createPoll(o, input({ encrypted: true })));
    must(svc.addToRoll(o, p.id, "a@example.com"));
    must(svc.openPoll(o, p.id));
    const token = [...svc.voterTokens(o, p.id).values()][0] ?? "";
    must(svc.castBallot(token, "against"));
    const row = db.prepare("SELECT choice, entry FROM ballots").get() as { choice: string; entry: string };
    expect(row.choice).toBe("");
    expect(row.entry).not.toContain("against");
    expect(row.entry).toContain("sealed");
  });

  it("keeps totals hidden from everyone until the counting key is given, then shows them", () => {
    const { poll, key, tokens } = sealedPoll();
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.castBallot(tokens[1] ?? "", "for"));
    must(service.castBallot(tokens[2] ?? "", "against"));
    expect(service.resultsFor(poll.id, "administrator")).toMatchObject({ turnout: 3, counts: null });
    expect(service.closePoll(owner, poll.id)).toEqual({ ok: false, error: "wrong_counting_key" });
    expect(service.closePoll(owner, poll.id, "QC-0000-0000")).toEqual({ ok: false, error: "wrong_counting_key" });
    expect(service.getPoll(poll.id)?.status).toBe("open");
    must(service.closePoll(owner, poll.id, key.toLowerCase().replaceAll("-", " ")));
    expect(service.resultsFor(poll.id, "voter")).toMatchObject({ pending: false, counts: { for: 2, against: 1, abstain: 0 } });
    expect(service.getPoll(poll.id)).toMatchObject({ status: "closed", counted: true });
  });

  it("shares the counting key between administrators: enough shares count, too few do not", () => {
    must(service.createKey(owner, { label: "Clerk", owner: false, administrator: true }));
    must(service.createKey(owner, { label: "Treasurer", owner: false, administrator: true }));
    const poll = must(service.createPoll(owner, input({ encrypted: true, keyThreshold: 2 })));
    must(service.addToRoll(owner, poll.id, "a@example.com\nb@example.com"));
    const opened = must(service.openPoll(owner, poll.id));
    expect(opened.countingKey).toBeNull();
    expect(opened.shares).toHaveLength(3);
    const shares = opened.shares.map((x) => x.share);
    const tokens = [...service.voterTokens(owner, poll.id).values()];
    must(service.castBallot(tokens[0] ?? "", "for"));
    must(service.castBallot(tokens[1] ?? "", "against"));
    expect(service.closePoll(owner, poll.id, shares[0])).toEqual({ ok: false, error: "wrong_counting_key" });
    expect(service.getPoll(poll.id)?.status).toBe("open");
    must(service.closePoll(owner, poll.id, `${shares[2]}\n${shares[0]}`));
    expect(service.resultsFor(poll.id, "voter")).toMatchObject({ counts: { for: 1, against: 1, abstain: 0 } });
  });

  it("refuses a shared counting key without enough administrators, or without encryption", () => {
    expect(service.createPoll(owner, input({ encrypted: false, keyThreshold: 2 }))).toEqual({ ok: false, error: "invalid_threshold" });
    const poll = must(service.createPoll(owner, input({ encrypted: true, keyThreshold: 2 })));
    must(service.addToRoll(owner, poll.id, "a@example.com"));
    expect(service.openPoll(owner, poll.id)).toEqual({ ok: false, error: "threshold_needs_admins" });
    expect(service.getPoll(poll.id)?.status).toBe("draft");
  });

  it("closes by itself without the key and waits for it", () => {
    const { poll, key, tokens } = (() => {
      const poll = must(service.createPoll(owner, input({ encrypted: true, closesAt: "2026-12-01T16:00:00.000Z" })));
      must(service.addToRoll(owner, poll.id, "a@example.com"));
      const opened = must(service.openPoll(owner, poll.id));
      return { poll, key: opened.countingKey ?? "", tokens: [...service.voterTokens(owner, poll.id).values()] };
    })();
    must(service.castBallot(tokens[0] ?? "", "abstain"));
    now = new Date("2026-12-01T16:30:00Z");
    expect(service.getPoll(poll.id)).toMatchObject({ status: "closed", counted: false });
    expect(service.resultsFor(poll.id, "administrator")).toMatchObject({ pending: true, turnout: 1, counts: null });
    expect(service.countPoll(owner, poll.id, "QC-AAAA")).toEqual({ ok: false, error: "wrong_counting_key" });
    must(service.countPoll(owner, poll.id, key));
    expect(service.resultsFor(poll.id, "administrator")).toMatchObject({ pending: false, counts: { for: 0, against: 0, abstain: 1 } });
  });

  it("still publishes a ledger and checks receipts for a sealed poll", () => {
    const { poll, key, tokens } = sealedPoll();
    const receipt = must(service.castBallot(tokens[0] ?? "", "for")).receipt;
    must(service.closePoll(owner, poll.id, key));
    expect(service.checkReceipt(poll.id, receipt)?.valid).toBe(true);
  });
});

describe("ledger", () => {
  it("publishes the ledger of a closed poll only, and checks a receipt with an inclusion proof", () => {
    const { poll, tokens } = openedPoll();
    const receipts = tokens.map((t, i) => must(service.castBallot(t, i === 0 ? "for" : "against")).receipt);
    expect(service.ledger(poll.id)).toBeNull();
    expect(service.checkReceipt(poll.id, receipts[0] ?? "")).toBeNull();
    must(service.closePoll(owner, poll.id));
    const ledger = service.ledger(poll.id);
    expect(ledger?.size).toBe(3);
    expect([...(ledger?.receipts ?? [])].sort()).toEqual([...receipts].sort());
    const checked = service.checkReceipt(poll.id, (receipts[1] ?? "").toLowerCase().replace("-", " "));
    expect(checked?.valid).toBe(true);
    expect(checked?.size).toBe(3);
    expect(service.checkReceipt(poll.id, "0000-0000-0000")).toBeNull();
  });
});
