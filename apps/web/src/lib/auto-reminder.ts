// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Reminders: one message to each participant who has not voted, never sooner than a day after the last message to them.
 * An administrator can send one by hand. A poll can also send them by itself, either every day or once, a day before it
 * closes. The rules live here, apart from the clock and the mail, so that they can be tested.
 */

import { utcToLocalInput } from "./zoned.js";

export type AutoReminder = "none" | "daily" | "before_close";
export const isAutoReminder = (v: unknown): v is AutoReminder => v === "none" || v === "daily" || v === "before_close";

/** The shortest time between two messages to the same participant. */
export const REMINDER_GAP_MS = 24 * 60 * 60 * 1000;
/** The local hour from which a daily reminder goes out. */
export const REMINDER_HOUR = 9;

/** Whether a participant who was last written to at `lastSentAt` may be written to again at `now`. */
export function mayWrite(lastSentAt: string | null, now: Date): boolean {
  if (lastSentAt === null) return true;
  const sent = Date.parse(lastSentAt);
  return Number.isNaN(sent) || now.getTime() - sent >= REMINDER_GAP_MS;
}

/** When a participant last written to at `lastSentAt` may be written to again. */
export function writeAgainAt(lastSentAt: string): Date {
  return new Date(Date.parse(lastSentAt) + REMINDER_GAP_MS);
}

export interface ReminderState {
  readonly mode: AutoReminder;
  readonly now: Date;
  readonly timeZone: string;
  readonly closesAt: string | null;
  /** The local day of the last automatic reminder ("2026-12-02"), or null. */
  readonly lastOn: string | null;
}

/** Whether the poll should send its automatic reminder now. */
export function reminderDue(s: ReminderState): boolean {
  if (s.mode === "none") return false;
  const local = utcToLocalInput(s.now.toISOString(), s.timeZone);
  const day = local.slice(0, 10);
  if (s.mode === "daily") return Number(local.slice(11, 13)) >= REMINDER_HOUR && s.lastOn !== day;
  // A day before closing, once. A poll that opens or is made less than a day from its deadline reminds right away.
  if (s.closesAt === null || s.lastOn !== null) return false;
  const closes = Date.parse(s.closesAt);
  return !Number.isNaN(closes) && s.now.getTime() >= closes - REMINDER_GAP_MS && s.now.getTime() < closes;
}
