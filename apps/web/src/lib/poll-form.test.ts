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
    const input = parsePollForm(form([["title", "Colour"], ["kind", "choice"], ["option", "Red"], ["option", "Blue"], ["timing", "live"], ["audience", "anyone"], ["theme", "seed-packet"], ["duration", "hours"], ["hours", "48"], ["encryption", "none"]]));
    expect(input).toMatchObject({ title: "Colour", kind: "choice", options: [{ label: "Red", icon: null, color: null }, { label: "Blue", icon: null, color: null }], timing: "live", audience: "anyone", theme: "seed-packet", closeAfterHours: 48, encrypted: false });
  });

  it("pairs each option with its icon and colour by position, and drops what the lists do not allow", () => {
    const input = parsePollForm(form([["kind", "choice"], ["option", "Garden"], ["option_icon", "tree"], ["option_color", "green"], ["option", ""], ["option_icon", "star"], ["option_color", "red"], ["option", "Roof"], ["option_icon", "<script>"], ["option_color", "#ff0000"]]));
    expect(input.options).toEqual([{ label: "Garden", icon: "tree", color: "green" }, { label: "Roof", icon: null, color: null }]);
  });

  it("falls back to the secret-ballot defaults for unknown values", () => {
    const input = parsePollForm(form([["title", "x"], ["timing", "now"], ["audience", "world"], ["theme", "neon"]]));
    expect(input).toMatchObject({ kind: "yes-no", timing: "close", audience: "voters", theme: "ballot-paper", closeAfterHours: null, encrypted: false });
  });

  it("reads a sealed poll", () => {
    expect(parsePollForm(form([["title", "x"], ["encryption", "sealed"]])).encrypted).toBe(true);
  });

  it("turns a bad number of hours into NaN so that the service refuses it", () => {
    expect(Number.isNaN(parsePollForm(form([["duration", "hours"], ["hours", "soon"]])).closeAfterHours)).toBe(true);
    expect(Number.isNaN(parsePollForm(form([["duration", "hours"], ["hours", ""]])).closeAfterHours)).toBe(true);
  });
});
