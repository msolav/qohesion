import { describe, expect, it } from "vitest";
import { adjustForContrast, contrastRatio, hasText, isHexColor, resolveText } from "../src/index.js";

describe("resolveText", () => {
  const text = { fr: "Pour", en: "In favour" };
  it("uses the exact language", () => expect(resolveText(text, "en")).toBe("In favour"));
  it("falls back from a regional tag to the base language", () => expect(resolveText(text, "fr-CA")).toBe("Pour"));
  it("falls back to French, then English, then anything", () => {
    expect(resolveText({ en: "Yes" }, "es")).toBe("Yes");
    expect(resolveText({ de: "Ja" }, "es")).toBe("Ja");
  });
  it("ignores blank translations", () => expect(resolveText({ fr: "  ", en: "Yes" }, "fr")).toBe("Yes"));
  it("returns an empty string for missing text", () => expect(resolveText(undefined, "fr")).toBe(""));
  it("reports whether a language has text", () => {
    expect(hasText(text, "fr")).toBe(true);
    expect(hasText(text, "es")).toBe(false);
  });
});

describe("colour contrast", () => {
  it("computes the known extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
  it("accepts only #rrggbb", () => {
    expect(isHexColor("#1F5C46")).toBe(true);
    expect(isHexColor("#fff")).toBe(false);
    expect(isHexColor("1F5C46")).toBe(false);
  });
  it("keeps a colour that already passes", () => {
    const r = adjustForContrast("#1F5C46", "#FFFFFF", 4.5);
    expect(r).toMatchObject({ color: "#1F5C46", adjusted: false, met: true });
  });
  it("darkens a light colour against white until it passes", () => {
    const r = adjustForContrast("#FFE066", "#FFFFFF", 4.5);
    expect(r.adjusted).toBe(true);
    expect(r.met).toBe(true);
    expect(contrastRatio(r.color, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
  });
  it("lightens a dark colour against a dark background", () => {
    const r = adjustForContrast("#223344", "#0F224C", 3);
    expect(r.met).toBe(true);
    expect(contrastRatio(r.color, "#0F224C")).toBeGreaterThanOrEqual(3);
  });
});
