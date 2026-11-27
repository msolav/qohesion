// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { TIME_ZONES, formatMoment, isTimeZone, utcToLocalInput, zonedToUtc } from "./zoned.js";

describe("dates in the zone of the organization", () => {
  it("converts a winter and a summer time in Montreal to UTC", () => {
    expect(zonedToUtc("2026-12-12T20:00", "America/Toronto")).toBe("2026-12-13T01:00:00.000Z"); // UTC-5
    expect(zonedToUtc("2026-07-01T12:00", "America/Toronto")).toBe("2026-07-01T16:00:00.000Z"); // UTC-4
  });

  it("handles the clock changes", () => {
    expect(zonedToUtc("2026-03-08T12:00", "America/Toronto")).toBe("2026-03-08T16:00:00.000Z"); // the day clocks went forward
    expect(zonedToUtc("2026-11-01T12:00", "America/Toronto")).toBe("2026-11-01T17:00:00.000Z"); // the day they went back
    expect(zonedToUtc("2026-06-01T12:00", "Europe/Paris")).toBe("2026-06-01T10:00:00.000Z");
    expect(zonedToUtc("2026-12-01T12:00", "UTC")).toBe("2026-12-01T12:00:00.000Z");
  });

  it("goes back and forth without drift", () => {
    for (const zone of TIME_ZONES) for (const local of ["2026-01-15T09:30", "2026-07-15T23:59", "2027-03-14T08:05"]) {
      const iso = zonedToUtc(local, zone);
      expect(iso, `${zone} ${local}`).not.toBeNull();
      expect(utcToLocalInput(iso ?? "", zone)).toBe(local);
    }
  });

  it("refuses what is not a date and time, or not a zone", () => {
    for (const bad of ["", "2026-12-12", "2026-13-12T20:00", "2026-02-30T20:00", "2026-12-12T24:00", "2026-12-12 20:00", "soon"]) expect(zonedToUtc(bad, "America/Toronto"), bad).toBeNull();
    expect(zonedToUtc("2026-12-12T20:00", "Mars/Olympus")).toBeNull();
    expect(isTimeZone("America/Toronto")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(utcToLocalInput("nope", "UTC")).toBe("");
  });

  it("writes a moment in the zone and language of the organization", () => {
    expect(formatMoment("2026-12-13T01:00:00.000Z", "en", "America/Toronto")).toContain("December 12, 2026");
    expect(formatMoment("2026-12-13T01:00:00.000Z", "fr", "America/Toronto")).toContain("12 décembre 2026");
  });
});
