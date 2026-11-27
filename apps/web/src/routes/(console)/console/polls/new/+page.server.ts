import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { parsePollForm } from "#lib/poll-form.js";
import { DEFAULT_THEME } from "#lib/theme.js";
import { DEFAULT_TIME_ZONE, suggestedClosing } from "#lib/zoned.js";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  if (!session.administrator) redirect(303, "/console/space");
  const space = service().getSpace(session.spaceId);
  const timeZone = space?.timeZone ?? DEFAULT_TIME_ZONE;
  return { theme: space?.theme ?? DEFAULT_THEME, timeZone, defaultCloses: suggestedClosing(new Date(), timeZone) };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    if (!data) return fail(400, { error: "invalid_type", input: null });
    const input = parsePollForm(data, service().getSpace(session.spaceId)?.timeZone ?? DEFAULT_TIME_ZONE);
    const result = service().createPoll(session, input);
    if (!result.ok) return fail(400, { error: result.error, input });
    redirect(303, `/console/polls/${result.value.id}/roll`);
  },
};
