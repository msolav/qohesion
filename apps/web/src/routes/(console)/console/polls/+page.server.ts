import type { PageServerLoad } from "./$types";
import { localize } from "#lib/poll-i18n.js";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  const polls = service().listPolls(session).map((p) => {
    const results = service().resultsFor(p.id, "administrator");
    return { id: p.id, title: localize(p, locals.locale).title, status: p.status, rollCount: p.rollCount, turnout: results?.turnout ?? null, openedAt: p.openedAt, closesAt: p.closesAt, opensAt: p.opensAt };
  });
  return { polls, canRun: session.administrator, timeZone: service().getSpace(session.spaceId)?.timeZone ?? "America/Toronto" };
};
