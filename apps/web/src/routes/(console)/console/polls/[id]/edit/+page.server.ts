import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { parsePollForm } from "#lib/poll-form.js";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals, params, parent }) => {
  const session = needSession(locals);
  const poll = service().pollFor(session, params.id);
  if (!poll || poll.status !== "draft") redirect(303, `/console/polls/${params.id}`);
  void parent;
  return {
    input: {
      title: poll.title,
      description: poll.description,
      kind: poll.kind,
      options: poll.kind === "choice" ? poll.options.map((o) => ({ label: o.label ?? "", icon: o.icon ?? null, color: o.color ?? null })) : [],
      timing: poll.timing,
      audience: poll.audience,
      theme: poll.theme,
      closeAfterHours: poll.closeAfterHours,
      encrypted: poll.encrypted,
    },
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    if (!data) return fail(400, { error: "invalid_type", input: null });
    const input = parsePollForm(data);
    const result = service().updatePoll(session, params.id, input);
    if (!result.ok) return fail(400, { error: result.error, input });
    redirect(303, `/console/polls/${params.id}`);
  },
};
