import type { PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  const polls = service().listPolls(session).map((p) => {
    const results = service().resultsFor(p.id, "administrator");
    return { id: p.id, title: p.title, status: p.status, rollCount: p.rollCount, turnout: results?.turnout ?? null, openedAt: p.openedAt, closesAt: p.closesAt };
  });
  return { polls, canRun: session.administrator };
};
