// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Automatic reminders: a timer in the server checks, every few minutes, which open polls owe a reminder and sends it. The
 * rules (who, when, how often) are in auto-reminder.ts and in the service; this file only joins them to the mail.
 */

import { consoleMessages } from "../i18n/console.js";
import { utcToLocalInput } from "../zoned.js";
import { sendInvitations, mailConfigured } from "./mail.js";
import { service } from "./runtime.js";

export interface ReminderRun {
  readonly polls: number;
  readonly sent: number;
  readonly failed: number;
}

/** Sends the reminders that are due now. `origin` is the public address of the installation, for the personal links. */
export async function runAutoReminders(origin: string, send?: Parameters<typeof sendInvitations>[2]): Promise<ReminderRun> {
  let polls = 0;
  let sent = 0;
  let failed = 0;
  if (!origin || (!mailConfigured() && !send)) return { polls, sent, failed };
  const svc = service();
  for (const due of svc.dueReminders()) {
    const poll = svc.getPoll(due.pollId);
    const space = svc.getSpace(due.spaceId);
    if (!poll || !space) continue;
    polls++;
    const m = consoleMessages[space.locale];
    // Held before sending, so that nothing else writes to the same people while the messages go out.
    const held = svc.reserveInvites(due.pollId, due.targets.map((t) => t.id));
    const targets = due.targets.filter((t) => held.some((h) => h.id === t.id));
    const report = await sendInvitations(
      targets.map((t) => ({ id: t.id, address: t.address, link: `${origin}/v/${t.token}` })),
      {
        locale: space.locale,
        organization: poll.organization,
        poll: poll.title,
        closesAt: poll.closesAt,
        timeZone: space.timeZone,
        reminder: true,
        ballotStatement: poll.encrypted ? m.seal.ballotSealed : m.seal.ballotPlain,
        resultsStatement: m.resultsStatement[poll.timing][poll.audience],
      },
      send,
    );
    sent += report.sent.length;
    failed += report.failed;
    svc.releaseInvites(due.pollId, held.filter((h) => !report.sent.includes(h.id)));
    svc.finishAutoReminder(due.pollId, report.sent.length, report.failed, utcToLocalInput(new Date().toISOString(), space.timeZone).slice(0, 10));
  }
  return { polls, sent, failed };
}
