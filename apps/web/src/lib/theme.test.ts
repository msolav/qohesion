import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, isTheme, themeFrom } from "./theme";

describe("theme", () => {
  it("accepts the two templates", () => {
    expect(themeFrom("seed-packet")).toBe("seed-packet");
    expect(themeFrom("ballot-paper")).toBe("ballot-paper");
  });

  it("falls back to the default for anything else", () => {
    for (const v of [null, undefined, "", "dark", "Seed-Packet", "seed-packet\"><script>"]) expect(themeFrom(v)).toBe(DEFAULT_THEME);
    expect(DEFAULT_THEME).toBe("seed-packet");
  });

  it("recognizes only known values", () => {
    expect(isTheme("seed-packet")).toBe(true);
    expect(isTheme("x")).toBe(false);
    expect(isTheme(1)).toBe(false);
  });
});
