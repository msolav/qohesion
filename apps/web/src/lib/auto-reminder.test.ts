// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { mayWrite, reminderDue, writeAgainAt } from "./auto-reminder.js";

const at = (iso: string) => new Date(iso);
const base = { timeZone: "America/Toronto", closesAt: "2026-12-10T01:00:00.000Z", lastOn: null } as const;

describe("reminders", () => {
  it("lets a participant be written to again only a day after the last message", () => {
    expect(mayWrite(null, at("2026-12-01T15:00:00Z"))).toBe(true);
    expect(mayWrite("2026-12-01T15:00:00.000Z", at("2026-12-02T14:59:59Z"))).toBe(false);
    expect(mayWrite("2026-12-01T15:00:00.000Z", at("2026-12-02T15:00:00Z"))).toBe(true);
    expect(writeAgainAt("2026-12-01T15:00:00.000Z").toISOString()).toBe("2026-12-02T15:00:00.000Z");
  });

  it("sends a daily reminder from 9 a.m. local time, once a day", () => {
    const daily = { ...base, mode: "daily" as const };
    expect(reminderDue({ ...daily, now: at("2026-12-02T13:59:00Z") })).toBe(false); // 8:59 in Toronto
    expect(reminderDue({ ...daily, now: at("2026-12-02T14:00:00Z") })).toBe(true); // 9:00
    expect(reminderDue({ ...daily, now: at("2026-12-02T20:00:00Z"), lastOn: "2026-12-02" })).toBe(false);
    expect(reminderDue({ ...daily, now: at("2026-12-03T14:00:00Z"), lastOn: "2026-12-02" })).toBe(true);
  });

  it("sends the reminder before closing once, in the last day", () => {
    const before = { ...base, mode: "before_close" as const };
    expect(reminderDue({ ...before, now: at("2026-12-08T12:00:00Z") })).toBe(false);
    expect(reminderDue({ ...before, now: at("2026-12-09T01:00:00Z") })).toBe(true);
    expect(reminderDue({ ...before, now: at("2026-12-09T20:00:00Z"), lastOn: "2026-12-09" })).toBe(false);
    expect(reminderDue({ ...before, now: at("2026-12-10T02:00:00Z") })).toBe(false); // after the deadline
    expect(reminderDue({ ...before, closesAt: null, now: at("2026-12-09T20:00:00Z") })).toBe(false);
  });

  it("sends nothing when automatic reminders are off", () => {
    expect(reminderDue({ ...base, mode: "none", now: at("2026-12-02T14:00:00Z") })).toBe(false);
  });
});
