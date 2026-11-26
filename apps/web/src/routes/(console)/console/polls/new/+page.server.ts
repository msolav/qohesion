import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { parsePollForm } from "#lib/poll-form.js";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  if (!session.administrator) redirect(303, "/console/space");
  const space = service().getSpace(session.spaceId);
  return { theme: space?.theme ?? "ballot-paper" };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    if (!data) return fail(400, { error: "invalid_type", input: null });
    const input = parsePollForm(data);
    const result = service().createPoll(session, input);
    if (!result.ok) return fail(400, { error: result.error, input });
    redirect(303, `/console/polls/${result.value.id}/roll`);
  },
};
