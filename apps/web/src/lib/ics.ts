// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * A calendar file (RFC 5545) with one event at the closing time of a poll and an alarm 24 hours before. It names the
 * poll and the organization and carries no personal link, so that nothing private ends up in a calendar service.
 */

export interface CalendarInput {
  readonly uid: string;
  readonly summary: string;
  readonly description: string;
  readonly alarmText: string;
  /** The closing time, as an ISO instant. */
  readonly closesAt: string;
  /** When the file was made, as an ISO instant (given, so that the output is repeatable). */
  readonly now: string;
}

function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines are folded at 75 octets, with a space starting each continuation, without cutting a character. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > 75) {
      out.push(current);
      current = " ";
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n");
}

export function calendarFile(input: CalendarInput): string {
  const end = new Date(new Date(input.closesAt).getTime() + 15 * 60_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qohesion//Voting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.uid}@qohesion`,
    `DTSTAMP:${stamp(input.now)}`,
    `DTSTART:${stamp(input.closesAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(input.alarmText)}`,
    "TRIGGER:-PT24H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
