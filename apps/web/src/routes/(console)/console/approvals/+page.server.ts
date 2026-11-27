import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";
import { DEFAULT_TIME_ZONE } from "#lib/zoned.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  if (!session.administrator && !session.owner) redirect(303, "/console");
  const { open, recent } = service().approvalRequests(session);
  return {
    open,
    recent,
    me: session.keyId,
    canAnswer: session.administrator,
    timeZone: service().getSpace(session.spaceId)?.timeZone ?? DEFAULT_TIME_ZONE,
    policy: service().approvalPolicy(session.spaceId),
    administrators: service().administratorCount(session.spaceId),
    setup: service().setupStatus(session.spaceId),
  };
};

export const actions: Actions = {
  confirm: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const digest = typeof data?.get("digest") === "string" ? String(data?.get("digest")) : "";
    const result = service().confirmSetup(session, digest);
    if (!result.ok) return fail(400, { error: result.error });
    return { confirmed: true as const };
  },
  answer: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const text = (name: string) => (typeof data?.get(name) === "string" ? String(data?.get(name)) : "");
    const answer = text("answer");
    const result = service().answerApproval(session, text("request"), answer === "approve" || answer === "reject" || answer === "abstain" ? answer : ("invalid" as never), text("digest"));
    if (!result.ok) return fail(400, { error: result.error, request: text("request") });
    return { answered: text("request") };
  },
};
