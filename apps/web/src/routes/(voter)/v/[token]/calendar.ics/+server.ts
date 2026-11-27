import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { calendarFile } from "#lib/ics.js";
import { consoleMessages, fill } from "#lib/i18n/console.js";
import { localize } from "#lib/poll-i18n.js";
import { isTestEdition, service } from "#lib/server/runtime.js";

/** A calendar file for the closing time of the poll, with an alarm 24 hours before. It carries no personal link. */
export const GET: RequestHandler = ({ params, locals }) => {
  if (!isTestEdition()) error(404, "Not found");
  const link = service().byToken(params.token);
  const poll = link?.poll;
  if (!poll || !poll.closesAt || poll.status === "closed" || poll.status === "cancelled") error(404, "Not found");
  const m = consoleMessages[locals.locale];
  const text = localize(poll, locals.locale);
  const body = calendarFile({
    uid: poll.id,
    summary: fill(m.voter.calendarSummary, { title: text.title }),
    description: fill(m.voter.calendarNote, { org: poll.organization }),
    alarmText: m.voter.calendarAlarm,
    closesAt: poll.closesAt,
    now: new Date().toISOString(),
  });
  return new Response(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'attachment; filename="voting-closes.ics"', "cache-control": "no-store" } });
};
