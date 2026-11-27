import { describe, expect, it } from "vitest";
import { messages } from "./i18n/messages";
import { DEFAULT_THEME, isTheme, THEME_NAMES, THEMES, themeFrom } from "./theme";

describe("theme", () => {
  it("accepts every template", () => {
    for (const theme of THEMES) expect(themeFrom(theme)).toBe(theme);
    expect([...THEMES]).toEqual(["standard", "seed-packet", "ballot-paper", "boarding-pass", "guide-map"]);
  });

  it("falls back to the default for anything else", () => {
    for (const v of [null, undefined, "", "dark", "Seed-Packet", "seed-packet\"><script>"]) expect(themeFrom(v)).toBe(DEFAULT_THEME);
    expect(DEFAULT_THEME).toBe("standard");
  });

  it("recognizes only known values", () => {
    expect(isTheme("seed-packet")).toBe(true);
    expect(isTheme("standard")).toBe(true);
    expect(isTheme("x")).toBe(false);
    expect(isTheme(1)).toBe(false);
  });

  it("names every template in both languages, matching the interface texts", () => {
    expect(Object.keys(THEME_NAMES).sort()).toEqual([...THEMES].sort());
    for (const theme of THEMES) {
      expect(THEME_NAMES[theme].fr.trim()).not.toBe("");
      expect(THEME_NAMES[theme].en.trim()).not.toBe("");
    }
    const p = { fr: messages.fr.preview, en: messages.en.preview };
    for (const locale of ["fr", "en"] as const) {
      expect(p[locale].templateSeedPacket).toBe(THEME_NAMES["seed-packet"][locale]);
      expect(p[locale].templateBallotPaper).toBe(THEME_NAMES["ballot-paper"][locale]);
      expect(p[locale].templateBoardingPass).toBe(THEME_NAMES["boarding-pass"][locale]);
      expect(p[locale].templateGuideMap).toBe(THEME_NAMES["guide-map"][locale]);
      expect(p[locale].templateStandard).toBe(THEME_NAMES["standard"][locale]);
    }
  });
});
