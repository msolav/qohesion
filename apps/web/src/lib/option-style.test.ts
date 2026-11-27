// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@qohesion/engine";
import { COLORS, COLOR_IDS, ICONS, ICON_IDS, iconOf, iconPath, isColorId, isIconId } from "./option-style.js";

describe("option colours", () => {
  // Surfaces the ballot templates and the console put a mark on.
  const light = ["#FFFFFF", "#FBFBF8", "#F8F8F6", "#E9E9E3", "#E6E6E2", "#F5F1E4", "#EEF3E9", "#F3F4F6"];
  const night = ["#0F224C", "#0B1B3E", "#17306A"];

  it("keeps every colour at least 3:1 against the surfaces it is drawn on", () => {
    for (const id of COLOR_IDS) {
      const c = COLORS[id];
      for (const bg of light) expect(contrastRatio(c?.ballot ?? "", bg), `${id} ballot on ${bg}`).toBeGreaterThanOrEqual(3);
      for (const bg of night) expect(contrastRatio(c?.night ?? "", bg), `${id} night on ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("option icons", () => {
  it("has a drawn path for every icon and a name in both languages", () => {
    expect(ICON_IDS.length).toBeGreaterThanOrEqual(12);
    for (const id of ICON_IDS) {
      expect(ICONS[id]?.d.length).toBeGreaterThan(5);
      expect(ICONS[id]?.fr).toBeTruthy();
      expect(ICONS[id]?.en).toBeTruthy();
    }
  });

  it("accepts only listed ids", () => {
    expect(isIconId("heart")).toBe(true);
    expect(isIconId("constructor")).toBe(false);
    expect(isIconId("<script>")).toBe(false);
    expect(isColorId("teal")).toBe(true);
    expect(isColorId("#ff0000")).toBe(false);
    expect(isColorId("__proto__")).toBe(false);
  });

  it("gives the three fixed options their meaning and a custom option none", () => {
    expect(iconOf({ id: "for" })).toBe("check");
    expect(iconOf({ id: "against" })).toBe("cross");
    expect(iconOf({ id: "abstain" })).toBe("dash");
    expect(iconOf({ id: "o1" })).toBeNull();
    expect(iconOf({ id: "o1", icon: "star" })).toBe("star");
    expect(iconOf({ id: "o1", icon: "nope" })).toBeNull();
    expect(iconPath("star")).toContain("M8 2.6");
    expect(iconPath(null)).toBeNull();
  });
});

describe("option colours in the stylesheet", () => {
  it("defines every colour of the list with the same values, and nothing else", () => {
    const css = readFileSync(new URL("./styles/base.css", import.meta.url), "utf8");
    const defined = [...css.matchAll(/\[data-color="([a-z]+)"\]\{--c:(#[0-9A-Fa-f]{6});--cn:(#[0-9A-Fa-f]{6})\}/g)];
    expect(defined.map((d) => d[1]).sort()).toEqual([...COLOR_IDS].sort());
    for (const [, id, ballot, night] of defined) {
      expect(ballot?.toUpperCase()).toBe(COLORS[id ?? ""]?.ballot.toUpperCase());
      expect(night?.toUpperCase()).toBe(COLORS[id ?? ""]?.night.toUpperCase());
    }
  });
});
