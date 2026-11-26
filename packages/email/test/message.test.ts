import { describe, expect, it } from "vitest";
import { buildHeaders, formatAddress, isEmailAddress, validateMessage } from "../src/index.js";
import { message } from "./helpers.js";

describe("addresses", () => {
  it("accepts ordinary addresses", () => {
    for (const a of ["a@b.co", "first.last+tag@mail.example.org"]) expect(isEmailAddress(a)).toBe(true);
  });
  it("rejects malformed addresses", () => {
    for (const a of ["", "a", "a@b", "a b@c.de", "a@b.c d", "<a@b.co>", "a@b.co,c@d.ef"]) expect(isEmailAddress(a)).toBe(false);
  });
  it("formats a display name without quotes", () => expect(formatAddress({ email: "a@b.co", name: 'Q"o' })).toBe("Qo <a@b.co>"));
  it("keeps a display name from posing as part of the address", () => {
    expect(formatAddress({ email: "noreply@qohesion.app", name: "Org <ceo@bank.example>" })).toBe("Org ceo@bank.example <noreply@qohesion.app>");
    expect(formatAddress({ email: "a@b.co", name: "A\\ B\r\nBcc: x@y.zz" })).toBe("A B Bcc: x@y.zz <a@b.co>");
    expect(formatAddress({ email: "a@b.co", name: "<>" })).toBe("a@b.co");
    expect(formatAddress({ email: "a@b.co" })).toBe("a@b.co");
  });
});

describe("validateMessage", () => {
  it("accepts a normal message", () => expect(validateMessage(message)).toEqual([]));
  it("blocks header injection in the subject and in custom headers", () => {
    const p = validateMessage({ ...message, subject: "hello\r\nBcc: x@y.zz", headers: { "X-Test": "a\nb" } });
    expect(p).toContain("subject contains a line break");
    expect(p).toContain('header "X-Test": value contains a line break');
  });
  it("requires subject, text and valid addresses", () => {
    const p = validateMessage({ ...message, subject: " ", text: "", to: { email: "nope" } });
    expect(p).toEqual(expect.arrayContaining(["subject is empty", "text body is empty", "to: not a valid address"]));
  });
  it("requires an https unsubscribe address", () => {
    expect(validateMessage({ ...message, unsubscribeUrl: "http://example.org/u" })).toContain("unsubscribeUrl must be an https address");
  });
});

describe("buildHeaders", () => {
  it("adds one-click unsubscribe headers", () => {
    const h = buildHeaders({ ...message, unsubscribeUrl: "https://example.org/u/1", unsubscribeMailto: "stop@mail.qohesion.app" });
    expect(h["List-Unsubscribe"]).toBe("<https://example.org/u/1>, <mailto:stop@mail.qohesion.app>");
    expect(h["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
  it("adds no unsubscribe headers when no address is given", () => expect(buildHeaders(message)).toEqual({}));
  it("keeps custom headers", () => expect(buildHeaders({ ...message, headers: { "X-Poll": "42" } })).toEqual({ "X-Poll": "42" }));
});
