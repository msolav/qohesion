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
    const report = await sendInvitations(
      due.targets.map((t) => ({ id: t.id, address: t.address, link: `${origin}/v/${t.token}` })),
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
    // Today's reminder counts as done even when nobody was left to write to, so the check does not repeat every few minutes.
    svc.markAutoReminded(due.pollId, report.sent, utcToLocalInput(new Date().toISOString(), space.timeZone).slice(0, 10));
  }
  return { polls, sent, failed };
}
