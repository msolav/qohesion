import { describe, expect, it } from "vitest";
import {
  applyEvent, canVote, isRegistered, registeredCount, summarize,
  type MemberEvent, type MemberStatus, type RollPhase,
} from "../src/index.js";

const STATUSES: MemberStatus[] = ["listed", "requested", "confirmed", "voted", "withdrawn", "bounced", "blocked"];
const EVENTS: MemberEvent[] = ["request", "confirm", "cast", "withdraw", "bounce", "complain", "block", "correct_address"];
const PHASES: RollPhase[] = ["registration", "frozen", "voting", "closed"];

function go(status: MemberStatus, event: MemberEvent, phase: RollPhase, late = false) {
  return applyEvent(status, event, phase, late ? { lateRegistration: true } : {});
}

describe("the normal path", () => {
  it("goes listed, requested, confirmed, voted across the phases", () => {
    let s: MemberStatus = "listed";
    const step = (event: MemberEvent, phase: RollPhase) => {
      const t = applyEvent(s, event, phase);
      expect(t.ok).toBe(true);
      if (t.ok) s = t.status;
    };
    step("request", "registration");
    expect(s).toBe("requested");
    step("confirm", "registration");
    expect(s).toBe("confirmed");
    step("cast", "voting");
    expect(s).toBe("voted");
  });

  it("reports whether the status changed", () => {
    expect(go("listed", "request", "registration")).toEqual({ ok: true, status: "requested", changed: true });
    expect(go("confirmed", "confirm", "registration")).toEqual({ ok: true, status: "confirmed", changed: false });
  });
});

describe("requests", () => {
  it("are accepted from listed, withdrawn and blocked addresses while registration is open", () => {
    for (const from of ["listed", "withdrawn", "blocked"] as const) {
      expect(go(from, "request", "registration")).toMatchObject({ ok: true, status: "requested" });
    }
  });

  it("are repeatable and leave a confirmed member confirmed in every open phase", () => {
    expect(go("requested", "request", "registration")).toMatchObject({ ok: true, status: "requested", changed: false });
    for (const phase of ["registration", "frozen", "voting"] as const) {
      expect(go("confirmed", "request", phase)).toMatchObject({ ok: true, status: "confirmed", changed: false });
    }
  });

  it("are refused once the roll is frozen, and during voting unless registration stays open", () => {
    expect(go("listed", "request", "frozen")).toEqual({ ok: false, reason: "phase" });
    expect(go("listed", "request", "voting")).toEqual({ ok: false, reason: "phase" });
    expect(go("listed", "request", "voting", true)).toMatchObject({ ok: true, status: "requested" });
  });

  it("are refused for a bounced address until it is corrected, and for a member who voted", () => {
    expect(go("bounced", "request", "registration")).toEqual({ ok: false, reason: "transition" });
    expect(go("voted", "request", "voting")).toEqual({ ok: false, reason: "transition" });
  });
});

describe("confirmation", () => {
  it("needs a request first", () => {
    expect(go("listed", "confirm", "registration")).toEqual({ ok: false, reason: "transition" });
    expect(go("bounced", "confirm", "registration")).toEqual({ ok: false, reason: "transition" });
  });

  it("cannot happen after the freeze, so the published count stays true", () => {
    expect(go("requested", "confirm", "frozen")).toEqual({ ok: false, reason: "phase" });
    expect(go("requested", "confirm", "voting")).toEqual({ ok: false, reason: "phase" });
  });

  it("can happen during voting when registration stays open", () => {
    expect(go("requested", "confirm", "voting", true)).toMatchObject({ ok: true, status: "confirmed" });
  });
});

describe("casting a ballot", () => {
  it("is possible once, only for a confirmed member, only while voting", () => {
    expect(go("confirmed", "cast", "voting")).toMatchObject({ ok: true, status: "voted" });
    expect(go("voted", "cast", "voting")).toEqual({ ok: false, reason: "transition" }); // second ballot
    expect(go("requested", "cast", "voting")).toEqual({ ok: false, reason: "transition" });
    expect(go("listed", "cast", "voting")).toEqual({ ok: false, reason: "transition" });
    expect(go("confirmed", "cast", "registration")).toEqual({ ok: false, reason: "phase" });
    expect(go("confirmed", "cast", "frozen")).toEqual({ ok: false, reason: "phase" });
  });
});

describe("withdrawal", () => {
  it("is possible for a requested or confirmed member", () => {
    expect(go("requested", "withdraw", "registration")).toMatchObject({ ok: true, status: "withdrawn" });
    expect(go("confirmed", "withdraw", "voting")).toMatchObject({ ok: true, status: "withdrawn" });
    expect(go("withdrawn", "withdraw", "registration")).toMatchObject({ ok: true, status: "withdrawn", changed: false });
  });

  it("is not possible after voting, because a cast ballot cannot be taken back", () => {
    expect(go("voted", "withdraw", "voting")).toEqual({ ok: false, reason: "transition" });
  });

  it("has no meaning for an address that never registered", () => {
    expect(go("listed", "withdraw", "registration")).toEqual({ ok: false, reason: "transition" });
  });
});

describe("delivery and complaint events", () => {
  it("marks a listed or requested address as bounced, and leaves registered members alone", () => {
    expect(go("listed", "bounce", "registration")).toMatchObject({ ok: true, status: "bounced" });
    expect(go("requested", "bounce", "registration")).toMatchObject({ ok: true, status: "bounced" });
    for (const s of ["confirmed", "voted", "withdrawn", "blocked", "bounced"] as const) {
      expect(go(s, "bounce", "registration")).toMatchObject({ ok: true, status: s, changed: false });
    }
  });

  it("lets the administrator replace a bounced address while registration is open", () => {
    expect(go("bounced", "correct_address", "registration")).toMatchObject({ ok: true, status: "listed" });
    expect(go("bounced", "correct_address", "frozen")).toEqual({ ok: false, reason: "phase" });
    expect(go("listed", "correct_address", "registration")).toEqual({ ok: false, reason: "transition" });
  });

  it("lets the administrator replace a bounced address during voting when registration stays open", () => {
    expect(go("bounced", "correct_address", "voting", true)).toMatchObject({ ok: true, status: "listed" });
    expect(go("bounced", "correct_address", "voting")).toEqual({ ok: false, reason: "phase" });
  });

  it("never lets a bounced address be mailed again without a correction", () => {
    // Whatever events follow, a bounced address leaves that status only through correct_address.
    for (const e of EVENTS) for (const p of PHASES) for (const late of [false, true]) {
      const t = go("bounced", e, p, late);
      if (t.ok && t.status !== "bounced") expect(e).toBe("correct_address");
    }
  });

  it("takes a complaining member out of the poll, and blocks an unprompted address", () => {
    expect(go("requested", "complain", "registration")).toMatchObject({ ok: true, status: "withdrawn" });
    expect(go("confirmed", "complain", "voting")).toMatchObject({ ok: true, status: "withdrawn" });
    expect(go("listed", "complain", "registration")).toMatchObject({ ok: true, status: "blocked" });
    expect(go("voted", "complain", "voting")).toMatchObject({ ok: true, status: "voted", changed: false });
  });

  it("blocks further unprompted mail without removing a registered member's right to vote", () => {
    expect(go("listed", "block", "registration")).toMatchObject({ ok: true, status: "blocked" });
    expect(go("bounced", "block", "registration")).toMatchObject({ ok: true, status: "bounced", changed: false });
    expect(go("confirmed", "block", "voting")).toMatchObject({ ok: true, status: "confirmed", changed: false });
    expect(go("voted", "block", "voting")).toMatchObject({ ok: true, status: "voted", changed: false });
  });
});

describe("a closed vote", () => {
  it("accepts no event at all", () => {
    for (const s of STATUSES) for (const e of EVENTS) expect(go(s, e, "closed")).toEqual({ ok: false, reason: "closed" });
  });
});

describe("invariants over every status, event and phase", () => {
  it("always returns a known status and consistent change flag", () => {
    for (const s of STATUSES) for (const e of EVENTS) for (const p of PHASES) for (const late of [false, true]) {
      const t = go(s, e, p, late);
      if (t.ok) {
        expect(STATUSES).toContain(t.status);
        expect(t.changed).toBe(t.status !== s);
      }
    }
  });

  it("never lets a member who voted leave that status", () => {
    for (const e of EVENTS) for (const p of PHASES) for (const late of [false, true]) {
      const t = go("voted", e, p, late);
      if (t.ok) expect(t.status).toBe("voted");
    }
  });

  it("only ever reaches voted by casting from confirmed during voting", () => {
    for (const s of STATUSES) for (const e of EVENTS) for (const p of PHASES) for (const late of [false, true]) {
      const t = go(s, e, p, late);
      if (t.ok && t.status === "voted" && s !== "voted") {
        expect([s, e, p]).toEqual(["confirmed", "cast", "voting"]);
      }
    }
  });

  it("only ever reaches confirmed through a request that was made, while registration is open", () => {
    for (const s of STATUSES) for (const e of EVENTS) for (const p of PHASES) for (const late of [false, true]) {
      const t = go(s, e, p, late);
      if (t.ok && t.status === "confirmed" && s !== "confirmed") {
        expect([s, e]).toEqual(["requested", "confirm"]);
        expect(p === "registration" || (p === "voting" && late)).toBe(true);
      }
    }
  });
});

describe("helpers", () => {
  it("lets only a confirmed member vote, and only while voting", () => {
    for (const s of STATUSES) for (const p of PHASES) expect(canVote(s, p)).toBe(s === "confirmed" && p === "voting");
  });

  it("counts confirmed members and those who voted as registered", () => {
    expect(STATUSES.filter(isRegistered)).toEqual(["confirmed", "voted"]);
    expect(registeredCount(["listed", "confirmed", "voted", "withdrawn", "confirmed"])).toBe(3);
    expect(registeredCount([])).toBe(0);
  });

  it("summarizes by status, with zero for the absent ones", () => {
    expect(summarize(["listed", "listed", "voted", "bounced"])).toEqual({
      listed: 2, requested: 0, confirmed: 0, voted: 1, withdrawn: 0, bounced: 1, blocked: 0,
    });
  });
});
