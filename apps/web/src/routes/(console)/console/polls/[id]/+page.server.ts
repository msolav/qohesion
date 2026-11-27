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
  const space = service().getSpace(needSession(locals).spaceId);
  return { rollSize: entries.length, voted: counts.voted, turnout: results?.turnout ?? null, timeZone: space?.timeZone ?? "America/Toronto" };
};

export const actions: Actions = {
  open: ({ locals, params }) => {
    const result = service().openPoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    // The counting key of a sealed poll exists only in this answer. It is not stored.
    if (result.value.countingKey || result.value.shares.length > 0) return { countingKey: result.value.countingKey, shares: result.value.shares, threshold: result.value.poll.keyThreshold };
    redirect(303, `/console/polls/${params.id}`);
  },
  close: async ({ request, locals, params }) => {
    const data = await request.formData().catch(() => undefined);
    const key = typeof data?.get("countingKey") === "string" ? String(data?.get("countingKey")) : "";
    const result = service().closePoll(needSession(locals), params.id, key);
    if (!result.ok) return fail(400, { error: result.error, step: "close" as const });
    redirect(303, `/console/polls/${params.id}/results`);
  },
  count: async ({ request, locals, params }) => {
    const data = await request.formData().catch(() => undefined);
    const key = typeof data?.get("countingKey") === "string" ? String(data?.get("countingKey")) : "";
    const result = service().countPoll(needSession(locals), params.id, key);
    if (!result.ok) return fail(400, { error: result.error, step: "count" as const });
    redirect(303, `/console/polls/${params.id}/results`);
  },
  schedule: ({ locals, params }) => {
    const result = service().schedulePoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    // As for opening: the counting key of a sealed poll exists only in this answer.
    if (result.value.countingKey || result.value.shares.length > 0) return { countingKey: result.value.countingKey, shares: result.value.shares, threshold: result.value.poll.keyThreshold };
    redirect(303, `/console/polls/${params.id}`);
  },
  unschedule: ({ locals, params }) => {
    const result = service().unschedulePoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/console/polls/${params.id}`);
  },
  cancel: ({ locals, params }) => {
    const result = service().cancelPoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/console/polls/${params.id}`);
  },
  remove: ({ locals, params }) => {
    const result = service().deletePoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, "/console/polls");
  },
};
