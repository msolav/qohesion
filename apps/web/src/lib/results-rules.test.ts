// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { accessTo, liveResultsWarning, type ResultsAudience, type Viewer } from "./results-rules.js";

const viewers: Viewer[] = ["owner", "administrator", "voter", "anyone"];
const audiences: ResultsAudience[] = ["owner", "administrators", "voters", "anyone"];

describe("results visibility", () => {
  it("shows nothing in a draft", () => {
    for (const v of viewers) expect(accessTo({ status: "draft", timing: "live", audience: "anyone" }, v)).toEqual({ turnout: false, totals: false });
  });

  it("keeps totals from everyone while a close-timed poll is open, and turnout from everyone but administrators", () => {
    for (const audience of audiences) {
      expect(accessTo({ status: "open", timing: "close", audience }, "administrator")).toEqual({ turnout: true, totals: false });
      expect(accessTo({ status: "open", timing: "close", audience }, "voter")).toEqual({ turnout: false, totals: false });
      expect(accessTo({ status: "open", timing: "close", audience }, "anyone")).toEqual({ turnout: false, totals: false });
    }
  });

  it("follows the audience while a live poll is open", () => {
    const live = (audience: ResultsAudience, viewer: Viewer) => accessTo({ status: "open", timing: "live", audience }, viewer).totals;
    expect(live("administrators", "administrator")).toBe(true);
    expect(live("administrators", "voter")).toBe(false);
    expect(live("voters", "voter")).toBe(true);
    expect(live("voters", "anyone")).toBe(false);
    expect(live("anyone", "anyone")).toBe(true);
  });

  it("keeps an administrator out of results meant for the owner alone, and lets the owner into every audience", () => {
    for (const audience of audiences) expect(accessTo({ status: "closed", timing: "close", audience }, "owner").totals).toBe(true);
    expect(accessTo({ status: "closed", timing: "close", audience: "owner" }, "administrator").totals).toBe(false);
    expect(accessTo({ status: "closed", timing: "close", audience: "administrators" }, "administrator").totals).toBe(true);
    for (const viewer of ["voter", "anyone"] as const) expect(accessTo({ status: "closed", timing: "close", audience: "owner" }, viewer).totals).toBe(false);
    expect(accessTo({ status: "open", timing: "live", audience: "owner" }, "administrator").totals).toBe(false);
    expect(accessTo({ status: "open", timing: "close", audience: "owner" }, "administrator").turnout).toBe(true);
  });

  it("applies the audience to the final results of a closed poll, whatever the timing", () => {
    expect(accessTo({ status: "closed", timing: "close", audience: "voters" }, "voter").totals).toBe(true);
    expect(accessTo({ status: "closed", timing: "close", audience: "voters" }, "anyone").totals).toBe(false);
    expect(accessTo({ status: "closed", timing: "close", audience: "administrators" }, "administrator").totals).toBe(true);
    expect(accessTo({ status: "closed", timing: "live", audience: "anyone" }, "anyone").totals).toBe(true);
  });

  it("warns about live results on a small roll only", () => {
    expect(liveResultsWarning("live", 3)).toBe(true);
    expect(liveResultsWarning("live", 5)).toBe(false);
    expect(liveResultsWarning("close", 3)).toBe(false);
  });
});
