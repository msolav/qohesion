import { describe, expect, it } from "vitest";
import {
  checkAddress, isDisposableDomain, isValidAddress, normalizeAddress, parseAddress, suggestDomain,
} from "../src/index.js";

describe("parseAddress", () => {
  it("accepts ordinary addresses and lower-cases the domain only", () => {
    expect(parseAddress("Marie.Tremblay@Exemple.CA")).toEqual({ local: "Marie.Tremblay", domain: "exemple.ca" });
    expect(parseAddress("  a+b@sous.domaine.qc.ca  ")).toEqual({ local: "a+b", domain: "sous.domaine.qc.ca" });
  });

  it.each([
    "", "plain", "@exemple.ca", "a@", "a@@exemple.ca", "a@b@exemple.ca", "a b@exemple.ca", "a..b@exemple.ca",
    ".a@exemple.ca", "a.@exemple.ca", "a@localhost", "a@exemple", "a@-exemple.ca", "a@exemple-.ca", "a@exa_mple.ca",
    "a@exemple.c", "a@exemple.123", "a@[127.0.0.1]", '"a b"@exemple.ca', "a@exemple..ca", "é@exemple.ca",
  ])("rejects %j", (input) => {
    expect(parseAddress(input)).toBeNull();
    expect(isValidAddress(input)).toBe(false);
  });

  it("enforces the length limits", () => {
    expect(parseAddress(`${"a".repeat(64)}@exemple.ca`)).not.toBeNull();
    expect(parseAddress(`${"a".repeat(65)}@exemple.ca`)).toBeNull();
    expect(parseAddress(`a@${"b".repeat(64)}.ca`)).toBeNull();
    expect(parseAddress(`${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.ca`)).toBeNull(); // over 254
  });

  it("accepts punycode domains and rejects raw non-ASCII ones", () => {
    expect(isValidAddress("a@xn--caf-dma.fr")).toBe(true);
    expect(isValidAddress("a@café.fr")).toBe(false);
  });
});

describe("normalizeAddress", () => {
  it("merges the variants that Gmail treats as one mailbox", () => {
    expect(normalizeAddress("Marie.Tremblay+vote@Gmail.com")).toBe("marietremblay@gmail.com");
    expect(normalizeAddress("marie.tremblay@googlemail.com")).toBe("marietremblay@gmail.com");
  });

  it("removes +tags but keeps dots for providers that ignore only the tag", () => {
    expect(normalizeAddress("Marie.Tremblay+x@Outlook.com")).toBe("marie.tremblay@outlook.com");
    expect(normalizeAddress("a+b@icloud.com")).toBe("a@icloud.com");
    expect(normalizeAddress("a+b@protonmail.com")).toBe("a@proton.me");
    expect(normalizeAddress("a@pm.me")).toBe("a@proton.me");
  });

  it("leaves other domains alone apart from case, since their local parts may be significant", () => {
    expect(normalizeAddress("Marie.Tremblay+x@exemple.ca")).toBe("marie.tremblay+x@exemple.ca");
  });

  it("returns null for an invalid address or an empty local part after cleaning", () => {
    expect(normalizeAddress("nope")).toBeNull();
    expect(normalizeAddress("+tag@gmail.com")).toBeNull();
    expect(normalizeAddress("...@gmail.com")).toBeNull();
  });
});

describe("suggestDomain", () => {
  it.each([
    ["gmial.com", "gmail.com"],
    ["gmail.con", "gmail.com"],
    ["gmai.com", "gmail.com"],
    ["gnail.com", "gmail.com"],
    ["hotmial.com", "hotmail.com"],
    ["outlok.com", "outlook.com"],
    ["yahooo.com", "yahoo.com"],
    ["videotorn.ca", "videotron.ca"],
    ["icloud.cmo", "icloud.com"],
  ])("suggests %s -> %s", (typo, fix) => {
    expect(suggestDomain(typo)).toBe(fix);
  });

  it("makes no suggestion for a known domain, a distant one, or a very short one", () => {
    expect(suggestDomain("gmail.com")).toBeNull();
    expect(suggestDomain("GMAIL.COM")).toBeNull();
    expect(suggestDomain("exemple.ca")).toBeNull();
    expect(suggestDomain("cooperative-du-parc.org")).toBeNull();
    expect(suggestDomain("a.co")).toBeNull();
  });

  it("makes no suggestion when two known domains are equally close", () => {
    expect(suggestDomain("live.co")).toBeNull(); // live.com and live.ca
    expect(suggestDomain("hotmail.co")).toBeNull(); // hotmail.com and hotmail.ca
  });

  it("accepts another list of known domains", () => {
    expect(suggestDomain("coop-solidaire.cq", ["coop-solidaire.ca"])).toBe("coop-solidaire.ca");
  });
});

describe("isDisposableDomain", () => {
  it("recognises the built-in list, case-insensitively, and an extra list", () => {
    expect(isDisposableDomain("Mailinator.com")).toBe(true);
    expect(isDisposableDomain("exemple.ca")).toBe(false);
    expect(isDisposableDomain("jetable.example", new Set(["jetable.example"]))).toBe(true);
  });
});

describe("checkAddress", () => {
  it("accepts a valid address and returns its normalized form", () => {
    expect(checkAddress("Marie.Tremblay@exemple.ca")).toEqual({ ok: true, normalized: "marie.tremblay@exemple.ca" });
  });

  it("flags an invalid address", () => {
    expect(checkAddress("marie@")).toEqual({ ok: false, issue: { code: "invalid" } });
  });

  it("refuses a disposable domain and says which", () => {
    expect(checkAddress("a@yopmail.com")).toEqual({
      ok: false, normalized: "a@yopmail.com", issue: { code: "disposable", domain: "yopmail.com" },
    });
  });

  it("keeps the address as entered but offers a correction for a probable typo", () => {
    expect(checkAddress("Marie@gmial.com")).toEqual({ ok: true, normalized: "marie@gmial.com", suggestion: "Marie@gmail.com" });
  });
});
