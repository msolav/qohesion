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
  title: "Adopt the 2027 budget",
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
    must(service.addToRoll(owner, poll.id, "c@example.com"));
    now = new Date("2026-12-02T15:00:01Z");
    const opened = service.getPoll(poll.id);
    expect(opened).toMatchObject({ status: "open", rollCount: 3 });
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
      options: opts("Vert", "Bleu"),
      translations: { languages: ["fr", "en"], title: { fr: "Quelle couleur?", en: "Which colour?" }, description: { fr: "", en: "" }, options: [{ fr: "Vert", en: "Green" }, { fr: "Bleu", en: "Blue" }] },
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
    expect(service.createPoll(owner, two({ translations: { languages: ["fr"], title: { fr: "Quelle couleur?" }, description: {}, options: [{ fr: "Vert" }, { fr: "Bleu" }] } })).ok).toBe(true);
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
    expect(service.resultsFor(poll.id, "administrator")?.answers).toEqual([{ who: "marie@example.org", choice: "for" }, { who: "jean@example.org", choice: "against" }]);
    expect(service.resultsFor(poll.id, "voter")?.answers?.[0]?.who).toBe("marie@example.org");
    expect(service.resultsFor(poll.id, "anyone")?.answers).toEqual([{ who: "m***@e***.org", choice: "for" }, { who: "j***@e***.org", choice: "against" }]);
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
    expect(service.resultsFor(poll.id, "voter")?.answers).toEqual([{ who: "marie@example.org", choice: "against" }]);
  });

  it("writes an address with most of it hidden", () => {
    expect(maskAddress("marie.tremblay@example.org")).toBe("m***@e***.org");
    expect(maskAddress("a@b.co")).toBe("a***@b***.co");
    expect(maskAddress("nonsense")).toBe("***");
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
    expect(service.invitees(owner, poll.id, "all").map((e) => e.address)).toEqual(["b@example.com", "c@example.com"]);
    expect(service.invitees(owner, poll.id, first[0]?.id ?? 0).map((e) => e.address)).toEqual(["b@example.com"]);
    expect(service.roll(owner, poll.id).find((e) => e.address === "b@example.com")?.invitedOn).toBe("2026-12-01");
    expect(service.history(owner, poll.id).some((h) => h.action === "links_sent" && h.detail === "1")).toBe(true);
  });

  it("offers nobody before the poll is open or after it closes, or to another organization", () => {
    const draft = must(service.createPoll(owner, input()));
    must(service.addToRoll(owner, draft.id, "a@example.com"));
    expect(service.invitees(owner, draft.id, "all")).toEqual([]);
    const { poll } = openedPoll();
    const other = service.session(service.signIn(must(service.createSpace({ name: "Other", locale: "en" })).key) ?? "") as Session;
    expect(service.invitees(other, poll.id, "all")).toEqual([]);
    must(service.closePoll(owner, poll.id));
    expect(service.invitees(owner, poll.id, "all")).toEqual([]);
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
