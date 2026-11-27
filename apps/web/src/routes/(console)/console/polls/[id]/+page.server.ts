import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { askedFor, needSession } from "#lib/server/web.js";
import { summarize, type MemberStatus } from "@qohesion/roll";

export const load: PageServerLoad = async ({ locals, params }) => {
  const session = needSession(locals);
  const entries = service().roll(session, params.id);
  const counts = summarize(entries.map((e) => e.status as MemberStatus));
  const results = service().resultsFor(params.id, "administrator");
  const space = service().getSpace(needSession(locals).spaceId);
  return {
    rollSize: entries.length,
    voted: counts.voted,
    turnout: results?.turnout ?? null,
    timeZone: space?.timeZone ?? "America/Toronto",
    approval: service().pollApprovalState(session, params.id),
    actions: {
      close_poll: service().actionApprovalState(session, "close_poll", params.id),
      cancel_poll: service().actionApprovalState(session, "cancel_poll", params.id),
      open_scheduled: service().actionApprovalState(session, "open_scheduled", params.id),
    },
    me: session.keyId,
    canAnswer: session.administrator,
  };
};

export const actions: Actions = {
  requestApproval: ({ locals, params }) => {
    const result = service().requestPublication(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/console/polls/${params.id}`);
  },
  answer: async ({ request, locals, params }) => {
    const data = await request.formData().catch(() => undefined);
    const text = (name: string) => (typeof data?.get(name) === "string" ? String(data?.get(name)) : "");
    const answer = text("answer");
    const result = service().answerApproval(needSession(locals), text("request"), answer === "approve" || answer === "reject" || answer === "abstain" ? answer : ("invalid" as never), text("digest"));
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/console/polls/${params.id}`);
  },
  open: ({ locals, params }) => {
    const session = needSession(locals);
    const result = service().openPoll(session, params.id);
    if (!result.ok) {
      // A scheduled poll opened early asks for its own approval. A draft is asked for on the approval panel.
      if (service().getPoll(params.id)?.status === "scheduled") {
        const asked = askedFor(service(), session, result.error, "open_scheduled", params.id);
        if (asked) return { requested: asked };
      }
      return fail(400, { error: result.error });
    }
    // The counting key of a sealed poll exists only in this answer. It is not stored.
    if (result.value.countingKey || result.value.shares.length > 0) return { countingKey: result.value.countingKey, shares: result.value.shares, threshold: result.value.poll.keyThreshold };
    redirect(303, `/console/polls/${params.id}`);
  },
  close: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const key = typeof data?.get("countingKey") === "string" ? String(data?.get("countingKey")) : "";
    const result = service().closePoll(session, params.id, key);
    if (!result.ok) {
      const asked = askedFor(service(), session, result.error, "close_poll", params.id);
      if (asked) return { requested: asked };
      return fail(400, { error: result.error, step: "close" as const });
    }
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
    const session = needSession(locals);
    const result = service().cancelPoll(session, params.id);
    if (!result.ok) {
      const asked = askedFor(service(), session, result.error, "cancel_poll", params.id);
      if (asked) return { requested: asked };
      return fail(400, { error: result.error });
    }
    redirect(303, `/console/polls/${params.id}`);
  },
  remove: ({ locals, params }) => {
    const result = service().deletePoll(needSession(locals), params.id);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, "/console/polls");
  },
};
