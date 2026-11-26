// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { optionLabel } from "./option-labels.js";

describe("option labels", () => {
  it("writes the fixed options in the interface language", () => {
    expect(optionLabel("fr", { id: "for", label: null })).toBe("Pour");
    expect(optionLabel("en", { id: "against", label: null })).toBe("Against");
  });
  it("keeps the text an administrator wrote", () => {
    expect(optionLabel("fr", { id: "o1", label: "Option rouge" })).toBe("Option rouge");
  });
});
