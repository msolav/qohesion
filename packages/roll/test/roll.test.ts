import { describe, expect, it } from "vitest";
import {
  addressFingerprint, applyAmendments, approvalCount, approvalsRequired, freezeRoll, isApproved, rollCode,
  type Amendment,
} from "../src/index.js";

const CODE = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
const KEY = "a-secret-key-of-32-characters-xx";
const fp = (address: string) => addressFingerprint(address, KEY);
const members = ["a@exemple.ca", "b@exemple.ca", "c@exemple.ca", "d@exemple.ca"].map(fp);

describe("rollCode", () => {
  it("has the form XXXX-XXXX-XXXX in Crockford base32, which has no I, L, O or U", () => {
    expect(rollCode(members)).toMatch(CODE);
    expect(rollCode([])).toMatch(CODE);
  });

  it("does not depend on order, and counts duplicates once", () => {
    expect(rollCode([...members].reverse())).toBe(rollCode(members));
    expect(rollCode([...members, members[0] ?? ""])).toBe(rollCode(members));
  });

  it("changes when one address is added, removed or replaced", () => {
    const code = rollCode(members);
    expect(rollCode([...members, fp("e@exemple.ca")])).not.toBe(code);
    expect(rollCode(members.slice(1))).not.toBe(code);
    expect(rollCode([...members.slice(1), fp("e@exemple.ca")])).not.toBe(code);
  });

  it("refuses a value that is not plain base64url text, so that two lists cannot give the same input", () => {
    expect(() => rollCode([""])).toThrow(/Invalid fingerprint/);
    expect(() => rollCode(["a\nb"])).toThrow(/Invalid fingerprint/);
    expect(() => rollCode(["a b"])).toThrow(/Invalid fingerprint/);
  });

  it("keeps the published format: a fixed list always gives the same code", () => {
    // These values are part of the verification format (version 1). Changing them breaks the check of past votes.
    // They were computed apart from this code: SHA-256 of "qohesion-roll-v1\nalpha\nbravo\ncharlie\n", first 60 bits.
    expect(rollCode(["alpha", "bravo", "charlie"])).toBe("10E0-JFYF-YDF0");
    expect(rollCode([])).toBe("CKWY-NFZW-ZN0Y");
  });
});

describe("freezeRoll", () => {
  it("publishes the count and the code, with the fingerprints sorted and without duplicates", () => {
    const frozen = freezeRoll([...members, ...members]);
    expect(frozen.count).toBe(4);
    expect(frozen.code).toBe(rollCode(members));
    expect([...frozen.fingerprints]).toEqual([...members].sort());
  });

  it("works for an empty roll", () => {
    expect(freezeRoll([])).toMatchObject({ count: 0, fingerprints: [] });
  });
});

const amendment = (over: Partial<Amendment> & Pick<Amendment, "id">): Amendment => ({
  kind: "added", fingerprint: fp("late@exemple.ca"), at: "2027-03-01T10:00:00Z", author: "admin-1",
  approvedBy: [], phase: "voting", ...over,
});

describe("approvals", () => {
  it("are required in number according to the assurance level", () => {
    expect(approvalsRequired("informal")).toBe(0);
    expect(approvalsRequired("formal")).toBe(1);
    expect(approvalsRequired("reinforced")).toBe(2);
  });

  it("do not count the author's own approval or repeated approvals", () => {
    const a = amendment({ id: "1", approvedBy: ["admin-1", "admin-2", "admin-2"] });
    expect(approvalCount(a)).toBe(1);
    expect(isApproved(a, "formal")).toBe(true);
    expect(isApproved(a, "reinforced")).toBe(false);
  });

  it("compare administrators without regard to case or spaces, and ignore empty names", () => {
    const a = amendment({ id: "1", author: "alice@x.org", approvedBy: ["Alice@x.org", " alice@x.org ", "", "  ", "bob@x.org", "BOB@x.org"] });
    expect(approvalCount(a)).toBe(1); // only Bob counts, once
  });

  it("are not needed at the informal level", () => {
    expect(isApproved(amendment({ id: "1" }), "informal")).toBe(true);
    expect(isApproved(amendment({ id: "1" }), "formal")).toBe(false);
  });
});

describe("applyAmendments", () => {
  const frozen = freezeRoll(members);

  it("changes nothing without amendments", () => {
    const r = applyAmendments(frozen.fingerprints, [], "formal");
    expect(r.code).toBe(frozen.code);
    expect(r.count).toBe(4);
    expect(r.late).toEqual([]);
    expect(r.pending).toEqual([]);
  });

  it("adds an approved address, changes the code, and reports it as added late", () => {
    const a = amendment({ id: "1", approvedBy: ["admin-2"] });
    const r = applyAmendments(frozen.fingerprints, [a], "formal");
    expect(r.count).toBe(5);
    expect(r.code).not.toBe(frozen.code);
    expect(r.late).toEqual([a]);
  });

  it("holds an unapproved amendment as pending, with no effect on the roll", () => {
    const a = amendment({ id: "1", approvedBy: ["admin-1"] });
    const r = applyAmendments(frozen.fingerprints, [a], "formal");
    expect(r.count).toBe(4);
    expect(r.code).toBe(frozen.code);
    expect(r.pending).toEqual([a]);
    expect(r.late).toEqual([]);
  });

  it("applies informal amendments without approval", () => {
    const r = applyAmendments(frozen.fingerprints, [amendment({ id: "1" })], "informal");
    expect(r.count).toBe(5);
  });

  it("does not mark an amendment made during registration as late", () => {
    const a = amendment({ id: "1", phase: "registration", approvedBy: ["admin-2"] });
    const r = applyAmendments(frozen.fingerprints, [a], "formal");
    expect(r.count).toBe(5);
    expect(r.late).toEqual([]);
  });

  it("marks an amendment made after the freeze as late, whether voting had started or not (ADR 0003, section 4)", () => {
    for (const phase of ["frozen", "voting"] as const) {
      const a = amendment({ id: "1", phase, approvedBy: ["admin-2"] });
      expect(applyAmendments(frozen.fingerprints, [a], "formal").late).toEqual([a]);
    }
  });

  it("removes an address, and ignores the removal of one that is not there", () => {
    const gone = members[0] ?? "";
    const removal = amendment({ id: "1", kind: "removed", fingerprint: gone, approvedBy: ["admin-2"] });
    const noop = amendment({ id: "2", kind: "removed", fingerprint: fp("nobody@exemple.ca"), approvedBy: ["admin-2"] });
    const r = applyAmendments(frozen.fingerprints, [removal, noop], "formal");
    expect(r.count).toBe(3);
    expect(r.fingerprints).not.toContain(gone);
  });

  it("applies amendments oldest first, whatever order they are given in", () => {
    const f = fp("late@exemple.ca");
    const add = amendment({ id: "1", at: "2027-03-01T10:00:00Z", approvedBy: ["admin-2"] });
    const remove = amendment({ id: "2", kind: "removed", fingerprint: f, at: "2027-03-01T11:00:00Z", approvedBy: ["admin-2"] });
    const r1 = applyAmendments(frozen.fingerprints, [add, remove], "formal");
    const r2 = applyAmendments(frozen.fingerprints, [remove, add], "formal");
    expect(r1.fingerprints).not.toContain(f); // added, then removed
    expect(r2.code).toBe(r1.code);
    const readded = amendment({ id: "3", at: "2027-03-01T12:00:00Z", approvedBy: ["admin-2"] });
    expect(applyAmendments(frozen.fingerprints, [readded, remove, add], "formal").fingerprints).toContain(f);
  });

  it("orders by the instant, not by the text of the time", () => {
    const f = fp("late@exemple.ca");
    // ".500Z" sorts after "Z" as text, but the remove at 10:00:00 comes first in time: the address ends up added.
    const add = amendment({ id: "1", at: "2027-03-01T10:00:00.500Z", approvedBy: ["admin-2"] });
    const remove = amendment({ id: "2", kind: "removed", fingerprint: f, at: "2027-03-01T10:00:00Z", approvedBy: ["admin-2"] });
    expect(applyAmendments(frozen.fingerprints, [add, remove], "formal").fingerprints).toContain(f);
    // A time with an offset is read as the instant it names: 09:00 at -05:00 is 14:00Z, after the 12:00Z removal.
    const addLocal = amendment({ id: "3", at: "2027-03-01T09:00:00-05:00", approvedBy: ["admin-2"] });
    const removeUtc = amendment({ id: "4", kind: "removed", fingerprint: f, at: "2027-03-01T12:00:00Z", approvedBy: ["admin-2"] });
    expect(applyAmendments(frozen.fingerprints, [removeUtc, addLocal], "formal").fingerprints).toContain(f);
  });

  it("breaks ties by comparing identifiers code unit by code unit, in every locale", () => {
    const f = fp("late@exemple.ca");
    const at = "2027-03-01T10:00:00Z";
    // "B" < "a" in code units. The later of the two (the add, "a") wins.
    const remove = amendment({ id: "B", kind: "removed", fingerprint: f, at, approvedBy: ["admin-2"] });
    const add = amendment({ id: "a", at, approvedBy: ["admin-2"] });
    expect(applyAmendments(frozen.fingerprints, [add, remove], "formal").fingerprints).toContain(f);
    expect(applyAmendments(frozen.fingerprints, [remove, add], "formal").fingerprints).toContain(f);
  });

  it("refuses a time without an offset (it would depend on the server's zone) or an invalid time", () => {
    for (const at of ["2027-03-01T10:00:00", "2027-03-01", "not a time", ""]) {
      expect(() => applyAmendments(frozen.fingerprints, [amendment({ id: "1", at })], "informal"), at).toThrow(/Invalid amendment time/);
    }
  });

  it("gives the same code as freezing the final list directly", () => {
    const a = amendment({ id: "1", approvedBy: ["admin-2"] });
    const r = applyAmendments(frozen.fingerprints, [a], "formal");
    expect(r.code).toBe(rollCode([...members, a.fingerprint]));
  });
});
