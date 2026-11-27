// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Dates of a poll are typed and shown in the time zone of the organization, and stored as UTC instants. These helpers
 * convert between the two without a library, with the time zone database of the platform.
 */

export const DEFAULT_TIME_ZONE = "America/Toronto";

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 60) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The offset of a zone from UTC at an instant, in milliseconds (positive east of Greenwich). */
function offsetAt(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-12-12T20:00" written in a zone, as an ISO instant, or null when it is not a valid date and time. */
export function zonedToUtc(local: string, timeZone: string): string | null {
  const m = LOCAL.exec(local.trim());
  if (!m || !isTimeZone(timeZone)) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(naive);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59) return null;
  // The offset depends on the instant, which depends on the offset: two passes settle it, also across a clock change.
  let instant = naive - offsetAt(naive, timeZone);
  instant = naive - offsetAt(instant, timeZone);
  return new Date(instant).toISOString();
}

/** An ISO instant as "YYYY-MM-DDTHH:mm" in a zone, the value a date-and-time input takes. */
export function utcToLocalInput(iso: string, timeZone: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms) || !isTimeZone(timeZone)) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** A moment written for people, in a zone and a language. */
export function formatMoment(iso: string, locale: "fr" | "en", timeZone: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long", timeStyle: "short", timeZone: isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE }).format(new Date(ms));
}

export const TIME_ZONES: readonly string[] = ["America/Toronto", "America/Halifax", "America/St_Johns", "America/Winnipeg", "America/Edmonton", "America/Vancouver", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/Paris", "Europe/London", "UTC"];

/** A suggestion for a closing date: a week from now, at 8 pm in the zone, as a date-and-time input value. */
export function suggestedClosing(now: Date, timeZone: string): string {
  const weekLater = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  return `${utcToLocalInput(weekLater, timeZone).slice(0, 10)}T20:00`;
}
