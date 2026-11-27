// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { NO_TRANSLATIONS, cleanLanguages, languageFor, localize, missingTexts } from "./poll-i18n.js";

const poll = {
  title: "Quelle couleur?",
  description: "",
  options: [{ id: "o1", label: "Vert" }, { id: "o2", label: "Bleu" }],
  translations: { languages: ["fr", "en"] as const, title: { fr: "Quelle couleur?", en: "Which colour?" }, description: { fr: "", en: "Advisory." }, options: [{ fr: "Vert", en: "Green" }, { fr: "Bleu", en: "Blue" }] },
};

describe("poll content in several languages", () => {
  it("shows a member the language they chose", () => {
    const en = localize(poll, "en");
    expect(en.title).toBe("Which colour?");
    expect(en.description).toBe("Advisory.");
    expect(en.options.map((o) => o.label)).toEqual(["Green", "Blue"]);
    expect(localize(poll, "fr").options.map((o) => o.label)).toEqual(["Vert", "Bleu"]);
  });

  it("shows the default language when theirs is not offered, and leaves the fixed options alone", () => {
    const frOnly = { ...poll, translations: { ...poll.translations, languages: ["fr"] as const } };
    expect(languageFor(frOnly.translations, "en")).toBe("fr");
    expect(localize(frOnly, "en").title).toBe("Quelle couleur?");
    const fixed = { ...poll, options: [{ id: "for", label: null }], translations: { ...poll.translations, options: [{}] } };
    expect(localize(fixed, "en").options).toEqual([{ id: "for", label: null }]);
  });

  it("falls back, text by text, to the default language and then to what was typed", () => {
    const partial = { ...poll, translations: { ...poll.translations, title: { fr: "Quelle couleur?" }, options: [{ fr: "Vert" }, { fr: "Bleu", en: "Blue" }] } };
    expect(localize(partial, "en").title).toBe("Quelle couleur?");
    expect(localize(partial, "en").options.map((o) => o.label)).toEqual(["Vert", "Blue"]);
    expect(localize({ ...poll, translations: NO_TRANSLATIONS }, "en").title).toBe("Quelle couleur?");
  });

  it("lists what is missing in each offered language", () => {
    expect(missingTexts(poll.translations, 2)).toEqual([]);
    const gaps = missingTexts({ ...poll.translations, title: { fr: "x", en: " " }, options: [{ fr: "a", en: "" }, { fr: "b", en: "c" }] }, 2);
    expect(gaps).toEqual(["title:en", "option1:en"]);
    expect(missingTexts(NO_TRANSLATIONS, 3)).toEqual([]);
  });

  it("keeps only known languages, once each, in order", () => {
    expect(cleanLanguages(["en", "fr", "en", "de", 3, null])).toEqual(["en", "fr"]);
    expect(cleanLanguages([])).toEqual([]);
  });
});
