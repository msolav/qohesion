// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { MAX_NAME, cleanName, parseRollText } from "./roll-line.js";

describe("parseRollText", () => {
  it("reads bare addresses separated by lines, commas and semicolons", () => {
    expect(parseRollText("a@example.org\nb@example.org, c@example.org; d@example.org").map((l) => l.address)).toEqual(["a@example.org", "b@example.org", "c@example.org", "d@example.org"]);
  });
  it("reads a name with an address in angle brackets", () => {
    expect(parseRollText("Marie Tremblay <marie@example.org>")).toEqual([{ line: "Marie Tremblay <marie@example.org>", name: "Marie Tremblay", address: "marie@example.org" }]);
  });
  it("lets a quoted name hold a comma", () => {
    const [entry] = parseRollText('"Tremblay, Marie" <marie@example.org>, jean@example.org');
    expect(entry).toMatchObject({ name: "Tremblay, Marie", address: "marie@example.org" });
    expect(parseRollText('"Tremblay, Marie" <marie@example.org>, jean@example.org')).toHaveLength(2);
  });
  it("mixes named and bare entries", () => {
    const lines = parseRollText("Marie <m@example.org>\nj@example.org\nLéa Roy <l@example.org>");
    expect(lines.map((l) => [l.name, l.address])).toEqual([["Marie", "m@example.org"], [null, "j@example.org"], ["Léa Roy", "l@example.org"]]);
  });
  it("keeps an entry without a name when the brackets hold only an address", () => {
    expect(parseRollText("<m@example.org>")[0]).toMatchObject({ name: null, address: "m@example.org" });
  });
  it("ignores empty entries", () => {
    expect(parseRollText(" ,\n;\n")).toEqual([]);
  });
});

describe("cleanName", () => {
  it("strips quotes and control characters and collapses spaces", () => {
    expect(cleanName('"  Marie \t Tremblay "')).toBe("Marie Tremblay");
  });
  it("returns null for nothing", () => {
    expect(cleanName('""')).toBeNull();
  });
  it("cuts a long name", () => {
    expect([...(cleanName("x".repeat(500)) ?? "")]).toHaveLength(MAX_NAME);
  });
});
