import { describe, expect, it } from "vitest";
import { messages } from "./messages";
import { LOCALES } from "./negotiate";

/** Every text of one language, with its path. */
function flatten(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => flatten(v, path ? `${path}.${k}` : k));
  return [];
}

const fr = flatten(messages.fr);
const en = flatten(messages.en);

describe("messages", () => {
  it("have the same keys in French and English", () => {
    expect(fr.map(([k]) => k)).toEqual(en.map(([k]) => k));
  });

  it("have no empty text", () => {
    for (const locale of LOCALES) for (const [key, text] of flatten(messages[locale])) expect(text.trim(), `${locale}.${key}`).not.toBe("");
  });

  it("differ between languages, except for names and codes that are the same in both", () => {
    const same = new Set(["brand.name", "shell.build", "shell.licence", "shell.languageFr", "shell.languageEn",
      "shell.version", "preview.organization", "preview.ballotTypeValue", "preview.quorum", "preview.templateSeedPacket", "preview.templateBallotPaper",
      "preview.templateBoardingPass", "preview.templateGuideMap", "preview.templateStandard"]);
    en.forEach(([key, text], i) => {
      if (!same.has(key)) expect(fr[i]?.[1], key).not.toBe(text);
    });
  });
});

describe("functional register (docs/content-style.md)", () => {
  // The tagline is brand register and may be warm. Everything else is functional.
  const functional = (list: [string, string][]) => list.filter(([key]) => key !== "brand.tagline");

  it("has no exclamation mark", () => {
    for (const [key, text] of [...functional(fr), ...functional(en)]) expect(text, key).not.toContain("!");
  });

  it("does not address the reader as an individual", () => {
    const second = /\b(you|your|yours|vous|votre|vos|tu|ton|ta|tes)\b/i;
    for (const [key, text] of [...functional(fr), ...functional(en)]) expect(text, key).not.toMatch(second);
  });

  it("makes no promise of ease, safety or speed", () => {
    const loaded = /\b(easy|simple(ly)?|secure|safe|fast|instant|effortless|facile|sécuritaire|sécurisé|rapide|instantané)\b/i;
    for (const [key, text] of functional(en)) {
      if (key === "preview.passingValue") continue; // "Simple majority" is a voting rule, not a claim
      expect(text, key).not.toMatch(loaded);
    }
    for (const [key, text] of functional(fr)) {
      if (key === "preview.passingValue") continue; // « Majorité simple » is a voting rule
      expect(text, key).not.toMatch(loaded);
    }
  });

  it("keeps the tagline in each language", () => {
    expect(messages.fr.brand.tagline).toBe("Décidons ensemble");
    expect(messages.en.brand.tagline).toBe("Decide together");
  });
});

describe("error messages", () => {
  it("have a text for every validation code, in both languages", () => {
    const codes = ["required", "invalid_type", "unknown_option", "duplicate_option", "too_few", "too_many", "too_long", "not_a_number",
      "not_an_integer", "below_min", "above_max", "invalid_color", "low_contrast"];
    for (const locale of LOCALES) expect(Object.keys(messages[locale].errors).sort()).toEqual([...codes].sort());
  });

  it("say what happened, what it means and what to do: at least three sentences or clauses", () => {
    for (const locale of LOCALES) {
      for (const [code, text] of Object.entries(messages[locale].errors)) {
        const parts = text.split(/(?<=[.])\s+/).filter(Boolean);
        expect(parts.length, `${locale}.${code}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
