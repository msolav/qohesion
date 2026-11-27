// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { gateAllows, gateCookieValue, passwordMatches, safeNext } from "./gate.js";

describe("gate", () => {
  it("makes a cookie that depends on both the secret and the password and does not contain the password", () => {
    const a = gateCookieValue(new Uint8Array(32).fill(1), "open sesame");
    expect(a).not.toContain("sesame");
    expect(a).toBe(gateCookieValue(new Uint8Array(32).fill(1), "open sesame"));
    expect(a).not.toBe(gateCookieValue(new Uint8Array(32).fill(2), "open sesame"));
    expect(a).not.toBe(gateCookieValue(new Uint8Array(32).fill(1), "open sesamE"));
  });

  it("compares passwords", () => {
    expect(passwordMatches("abc", "abc")).toBe(true);
    expect(passwordMatches("abc", "abd")).toBe(false);
    expect(passwordMatches("", "abc")).toBe(false);
  });

  it("keeps only the gate, its files and the version check open", () => {
    expect(gateAllows("/gate")).toBe(true);
    expect(gateAllows("/_app/immutable/x.js")).toBe(true);
    expect(gateAllows("/version")).toBe(true);
    expect(gateAllows("/start")).toBe(false);
    expect(gateAllows("/console/polls")).toBe(false);
    expect(gateAllows("/v/ABC")).toBe(false);
    expect(gateAllows("/api/results/x")).toBe(false);
  });

  it("only sends people back to a path of this site", () => {
    expect(safeNext("/v/ABC?x=1")).toBe("/v/ABC?x=1");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("/\\evil")).toBe("/");
    expect(safeNext("/gate")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
