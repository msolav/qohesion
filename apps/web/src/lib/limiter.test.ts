// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter.js";

describe("limiter", () => {
  it("allows the set number of attempts in the window, then refuses, then allows again", () => {
    let t = 0;
    const limiter = createLimiter({ max: 3, windowMs: 1000, now: () => t });
    expect([limiter.hit("a"), limiter.hit("a"), limiter.hit("a"), limiter.hit("a")]).toEqual([true, true, true, false]);
    expect(limiter.hit("b")).toBe(true);
    t = 1001;
    expect(limiter.hit("a")).toBe(true);
  });
});
