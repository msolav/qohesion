import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";
import { summarize, type MemberStatus } from "@qohesion/roll";

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = needSession(locals);
  const entries = service().roll(session, params.id);
  const counts = summarize(entries.map((e) => e.status as MemberStatus));
  const results = service().resultsFor(params.id, "administrator");
  return { rollSize: entries.length, voted: counts.voted, turnout: results?.turnout ?? null };
};

export const actions: Actions = {
  open: ({ locals, params }) => {
    const result = service().openPoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/console/polls/${params.id}`);
  },
  close: ({ locals, params }) => {
    const result = service().closePoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/console/polls/${params.id}/results`);
  },
  remove: ({ locals, params }) => {
    const result = service().deletePoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, "/console/polls");
  },
};
