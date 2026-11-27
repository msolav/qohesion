// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { parsePollForm } from "./poll-form.js";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

describe("poll form", () => {
  it("reads a choice poll with live results", () => {
    const input = parsePollForm(form([["title", "Colour"], ["kind", "choice"], ["option", "Red"], ["option", "Blue"], ["timing", "live"], ["audience", "anyone"], ["theme", "seed-packet"], ["closes_at", "2026-12-12T20:00"], ["encryption", "none"]]));
    expect(input).toMatchObject({ title: "Colour", kind: "choice", options: [{ label: "Red", icon: null, color: null }, { label: "Blue", icon: null, color: null }], timing: "live", audience: "anyone", theme: "seed-packet", closesAt: "2026-12-13T01:00:00.000Z", encrypted: false });
  });

  it("pairs each option with its icon and colour by position, and drops what the lists do not allow", () => {
    const input = parsePollForm(form([["kind", "choice"], ["option", "Garden"], ["option_icon", "tree"], ["option_color", "green"], ["option", ""], ["option_icon", "star"], ["option_color", "red"], ["option", "Roof"], ["option_icon", "<script>"], ["option_color", "#ff0000"]]));
    expect(input.options).toEqual([{ label: "Garden", icon: "tree", color: "green" }, { label: "Roof", icon: null, color: null }]);
  });

  it("falls back to the secret-ballot defaults for unknown values", () => {
    const input = parsePollForm(form([["title", "x"], ["timing", "now"], ["audience", "world"], ["theme", "neon"]]));
    expect(input).toMatchObject({ kind: "yes-no", timing: "close", audience: "voters", theme: "standard", opensAt: null, closesAt: "", encrypted: false });
  });

  it("reads how the colours are drawn", () => {
    expect(parsePollForm(form([["marks", "fill"]])).markFill).toBe(true);
    expect(parsePollForm(form([["marks", "outline"]])).markFill).toBe(false);
    expect(parsePollForm(form([])).markFill).toBe(false);
  });

  it("reads a sealed poll", () => {
    expect(parsePollForm(form([["title", "x"], ["encryption", "sealed"]])).encrypted).toBe(true);
  });

  it("reads the dates in the time zone of the organization", () => {
    const input = parsePollForm(form([["opens_mode", "date"], ["opens_at", "2026-12-10T09:00"], ["closes_at", "2026-12-12T20:00"]]), "America/Toronto");
    expect(input.opensAt).toBe("2026-12-10T14:00:00.000Z");
    expect(input.closesAt).toBe("2026-12-13T01:00:00.000Z");
    expect(parsePollForm(form([["closes_at", "2026-12-12T20:00"]])).opensAt).toBeNull();
    expect(parsePollForm(form([["opens_mode", "date"], ["opens_at", "soon"]])).opensAt).toBe("invalid");
    expect(parsePollForm(form([["closes_at", "whenever"]])).closesAt).toBe("");
  });

  it("reads the closing rules and a bad number becomes NaN so that the service refuses it", () => {
    const rules = parsePollForm(form([["rule_votes", "yes"], ["rule_votes_n", "12"], ["rule_turnout", "yes"], ["rule_turnout_p", "soon"], ["rule_threshold", "percent"], ["rule_threshold_p", "60"]])).rules;
    expect(rules.afterVotes).toBe(12);
    expect(Number.isNaN(rules.turnoutPercent)).toBe(true);
    expect(rules.threshold).toBe(60);
    expect(parsePollForm(form([["rule_threshold", "majority"]])).rules).toEqual({ afterVotes: null, turnoutPercent: null, threshold: "majority" });
    expect(parsePollForm(form([["rule_votes_n", "12"]])).rules).toEqual({ afterVotes: null, turnoutPercent: null, threshold: null });
  });

  it("reads a poll offered in two languages, the default first, with every option in each", () => {
    const input = parsePollForm(form([
      ["languages", "fr"], ["languages", "en"], ["default_language", "en"], ["kind", "choice"],
      ["title_fr", "Quelle couleur?"], ["title_en", "Which colour?"], ["description_fr", "Consultatif"], ["description_en", ""],
      ["option_fr", "Vert"], ["option_en", "Green"], ["option_icon", "leaf"], ["option_color", "green"],
      ["option_fr", "Bleu"], ["option_en", "Blue"], ["option_icon", ""], ["option_color", ""],
      ["option_fr", "dropped with its row"], ["option_en", ""], ["option_icon", ""], ["option_color", ""],
    ]));
    expect(input.title).toBe("Which colour?");
    expect(input.options.map((o) => o.label)).toEqual(["Green", "Blue"]);
    expect(input.options[0]).toMatchObject({ icon: "leaf", color: "green" });
    expect(input.translations.languages).toEqual(["en", "fr"]);
    expect(input.translations.title).toEqual({ en: "Which colour?", fr: "Quelle couleur?" });
    expect(input.translations.options).toEqual([{ en: "Green", fr: "Vert" }, { en: "Blue", fr: "Bleu" }]);
  });

  it("keeps working with a form that carries one language and no list of languages", () => {
    const input = parsePollForm(form([["title", "Hello"], ["kind", "choice"], ["option", "A"], ["option", "B"]]));
    expect(input.title).toBe("Hello");
    expect(input.options.map((o) => o.label)).toEqual(["A", "B"]);
    expect(input.translations.languages).toEqual([]);
  });

  it("reads whether a vote can be changed", () => {
    expect(parsePollForm(form([["allow_change", "yes"]])).allowChange).toBe(true);
    expect(parsePollForm(form([])).allowChange).toBe(false);
  });
});
