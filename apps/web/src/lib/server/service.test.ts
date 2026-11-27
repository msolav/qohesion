// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { Service, type PollInput, type Session } from "./service.js";

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
  closeAfterHours: null,
  encrypted: false,
  ...over,
});

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
    expect(service.createPoll(owner, input({ kind: "choice", options: ["Only one"] }))).toEqual({ ok: false, error: "options_too_few" });
    expect(service.createPoll(owner, input({ kind: "choice", options: ["Red", "red"] }))).toEqual({ ok: false, error: "options_duplicate" });
    expect(service.createPoll(owner, input({ closeAfterHours: 0 }))).toEqual({ ok: false, error: "invalid_duration" });
    const poll = must(service.createPoll(owner, input({ kind: "choice", options: ["Red", "Blue", " "] })));
    expect(poll.options.map((o) => o.label)).toEqual(["Red", "Blue"]);
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
    const { poll } = openedPoll({ closeAfterHours: 2 });
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
    expect(columns("ballots")).toEqual(["poll_id", "seq", "choice", "entry"]);
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
      const poll = must(service.createPoll(owner, input({ encrypted: true, closeAfterHours: 1 })));
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
