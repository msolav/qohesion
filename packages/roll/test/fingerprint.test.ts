import { describe, expect, it } from "vitest";
import { addressFingerprint, likelySameGroup, overlap } from "../src/index.js";

const KEY = "a-secret-key-of-32-characters-xx";
const OTHER_KEY = "another-secret-key-32-characters";

describe("addressFingerprint", () => {
  it("is stable for the same address and key", () => {
    expect(addressFingerprint("marie@exemple.ca", KEY)).toBe(addressFingerprint("marie@exemple.ca", KEY));
  });

  it("has 32 URL-safe characters and does not contain the address", () => {
    const f = addressFingerprint("marie@exemple.ca", KEY);
    expect(f).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(f.toLowerCase()).not.toContain("marie");
  });

  it("gives one value for every spelling of the same mailbox", () => {
    const a = addressFingerprint("Marie.Tremblay@gmail.com", KEY);
    expect(addressFingerprint("marietremblay+vote@gmail.com", KEY)).toBe(a);
    expect(addressFingerprint("MARIE.TREMBLAY@googlemail.com", KEY)).toBe(a);
  });

  it("gives different values for different addresses and for different keys", () => {
    const a = addressFingerprint("marie@exemple.ca", KEY);
    expect(addressFingerprint("louis@exemple.ca", KEY)).not.toBe(a);
    expect(addressFingerprint("marie@exemple.ca", OTHER_KEY)).not.toBe(a);
  });

  it("accepts a key as bytes", () => {
    expect(addressFingerprint("marie@exemple.ca", new TextEncoder().encode(KEY))).toBe(addressFingerprint("marie@exemple.ca", KEY));
  });

  it("refuses a short key and an invalid address", () => {
    expect(() => addressFingerprint("marie@exemple.ca", "short")).toThrow(/16 bytes/);
    expect(() => addressFingerprint("marie@exemple.ca", new Uint8Array(15))).toThrow(/16 bytes/);
    expect(() => addressFingerprint("not an address", KEY)).toThrow(/Invalid address/);
  });
});

const set = (...v: string[]) => new Set(v);

describe("overlap", () => {
  it("counts shared values and gives both ratios", () => {
    const o = overlap(set("a", "b", "c", "d"), set("c", "d", "e", "f", "g", "h"));
    expect(o.common).toBe(2);
    expect(o.containment).toBeCloseTo(0.5); // 2 of the 4 in the smaller list
    expect(o.jaccard).toBeCloseTo(2 / 8);
  });

  it("is symmetric", () => {
    const a = set("a", "b", "c");
    const b = set("b", "c", "d", "e");
    expect(overlap(a, b)).toEqual(overlap(b, a));
  });

  it("handles empty lists without dividing by zero", () => {
    expect(overlap(set(), set())).toEqual({ common: 0, containment: 0, jaccard: 0 });
    expect(overlap(set(), set("a"))).toEqual({ common: 0, containment: 0, jaccard: 0 });
  });

  it("reports full containment of a small list inside a large one", () => {
    expect(overlap(set("a", "b"), set("a", "b", "c", "d")).containment).toBe(1);
  });
});

describe("likelySameGroup", () => {
  const ids = (n: number, from = 0) => Array.from({ length: n }, (_, i) => `m${from + i}`);

  it("flags a large list that is mostly contained in another", () => {
    expect(likelySameGroup(overlap(set(...ids(20)), set(...ids(30))))).toBe(true);
  });

  it("does not flag a small overlap, which is normal for people in several groups", () => {
    expect(likelySameGroup(overlap(set(...ids(40)), set(...ids(40, 36))))).toBe(false); // 4 shared of 40
  });

  it("does not flag a handful of shared addresses even if they are all of a tiny list", () => {
    expect(likelySameGroup(overlap(set(...ids(3)), set(...ids(300))))).toBe(false); // 3 < minCommon
  });

  it("does not flag a moderate overlap below the threshold", () => {
    expect(likelySameGroup(overlap(set(...ids(20)), set(...ids(40, 10))))).toBe(false); // 10 shared of 20 = 0.5
  });

  it("takes other limits", () => {
    const o = overlap(set(...ids(20)), set(...ids(40, 10)));
    expect(likelySameGroup(o, { threshold: 0.5, minCommon: 10 })).toBe(true);
    expect(likelySameGroup(o, { threshold: 0.5, minCommon: 11 })).toBe(false);
  });
});
