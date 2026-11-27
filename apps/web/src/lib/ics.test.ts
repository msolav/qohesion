// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { calendarFile } from "./ics.js";

const input = { uid: "p1", summary: "Fin du vote: Budget, 2027; été", description: "Une ligne\nUne autre", alarmText: "Dans 24 heures", closesAt: "2026-12-01T16:00:00.000Z", now: "2026-11-26T12:00:00.000Z" };

describe("calendarFile", () => {
  const text = calendarFile(input);

  it("puts the event at the closing time with an alarm 24 hours before", () => {
    expect(text).toContain("DTSTART:20261201T160000Z");
    expect(text).toContain("TRIGGER:-PT24H");
    expect(text).toContain("ACTION:DISPLAY");
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas, semicolons and line breaks", () => {
    expect(text).toContain("SUMMARY:Fin du vote: Budget\\, 2027\\; été");
    expect(text).toContain("DESCRIPTION:Une ligne\\nUne autre");
  });

  it("folds lines at 75 octets without cutting a character", () => {
    const long = calendarFile({ ...input, summary: "é".repeat(80) });
    for (const line of long.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(long.replace(/\r\n /g, "")).toContain(`SUMMARY:${"é".repeat(80)}`);
  });
});
