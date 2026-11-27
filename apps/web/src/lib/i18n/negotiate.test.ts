import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, negotiateLocale, parseAcceptLanguage, pollLocale } from "./negotiate";

describe("parseAcceptLanguage", () => {
  it("orders tags by weight, then by position", () => {
    expect(parseAcceptLanguage("fr;q=0.5, en-CA, en;q=0.9, de;q=0.5")).toEqual(["en-ca", "en", "fr", "de"]);
  });

  it("drops tags with a zero or invalid weight and malformed parts", () => {
    expect(parseAcceptLanguage("fr;q=0, en;q=abc, de;q=2, , 12, es")).toEqual(["en", "es"]);
  });

  it("returns an empty list for a missing header", () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });

  it("keeps the wildcard as a tag", () => {
    expect(parseAcceptLanguage("*")).toEqual(["*"]);
  });
});

describe("negotiateLocale", () => {
  it("uses French when nothing is known", () => {
    expect(negotiateLocale({})).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("fr");
  });

  it("follows the browser: French or English, with regions", () => {
    expect(negotiateLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8" })).toBe("fr");
    expect(negotiateLocale({ acceptLanguage: "en;q=0.4, fr;q=0.8" })).toBe("fr");
  });

  it("takes the first supported language when the preferred ones are not supported", () => {
    expect(negotiateLocale({ acceptLanguage: "de, es;q=0.9, en;q=0.5" })).toBe("en");
  });

  it("uses French when the browser language is neither French nor English", () => {
    expect(negotiateLocale({ acceptLanguage: "de-DE,de;q=0.9,es;q=0.5" })).toBe("fr");
    expect(negotiateLocale({ acceptLanguage: "*" })).toBe("fr");
  });

  it("prefers the remembered choice over the browser, and the explicit choice over both", () => {
    expect(negotiateLocale({ cookie: "en", acceptLanguage: "fr" })).toBe("en");
    expect(negotiateLocale({ query: "fr", cookie: "en", acceptLanguage: "en" })).toBe("fr");
  });

  it("ignores values that are not supported languages", () => {
    expect(negotiateLocale({ query: "de", cookie: "xx", acceptLanguage: "en" })).toBe("en");
    expect(negotiateLocale({ query: "EN" })).toBe("fr"); // exact, lower-case codes only
    expect(negotiateLocale({ query: "", cookie: null })).toBe("fr");
  });
});

describe("isLocale", () => {
  it("accepts fr and en only", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr-CA")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(3)).toBe(false);
  });
});

describe("pollLocale", () => {
  it("follows the visitor's choice, then the browser, when the poll offers the language", () => {
    expect(pollLocale(["en", "fr"], { query: "fr", acceptLanguage: "en" })).toBe("fr");
    expect(pollLocale(["en", "fr"], { cookie: "fr", acceptLanguage: "en" })).toBe("fr");
    expect(pollLocale(["en", "fr"], { acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8" })).toBe("fr");
    expect(pollLocale(["fr", "en"], { acceptLanguage: "en-US" })).toBe("en");
  });

  it("takes the next browser language the poll offers", () => {
    expect(pollLocale(["en"], { acceptLanguage: "fr-CA,en;q=0.8" })).toBe("en");
  });

  it("uses the fallback language of the poll, the first one, when nothing is detected or nothing matches", () => {
    expect(pollLocale(["en", "fr"], {})).toBe("en");
    expect(pollLocale(["fr", "en"], { acceptLanguage: "de-DE,es;q=0.8" })).toBe("fr");
    expect(pollLocale(["en"], { query: "fr", acceptLanguage: "fr" })).toBe("en");
  });

  it("leaves the ordinary choice alone when the poll lists no language", () => {
    expect(pollLocale([], { acceptLanguage: "en" })).toBeNull();
  });
});
