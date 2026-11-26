import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { isTestEdition, service } from "#lib/server/runtime.js";
import { receiptCheck, resultsPage } from "#lib/server/web.js";

export const load: PageServerLoad = ({ params, locals }) => {
  if (!isTestEdition()) error(404, "Not found");
  const poll = service().getPoll(params.pollId);
  if (!poll || poll.status === "draft") error(404, "Not found");
  const page = resultsPage(locals, poll, null);
  return { ...page, organization: service().getSpace(poll.spaceId)?.name ?? null, poll: { id: poll.id, title: poll.title, options: poll.options, timing: poll.timing, audience: poll.audience, status: poll.status } };
};

export const actions: Actions = {
  check: async ({ request, params, locals }) => {
    const poll = service().getPoll(params.pollId);
    if (!poll) error(404, "Not found");
    const data = await request.formData().catch(() => undefined);
    return { check: receiptCheck(locals, poll, null, typeof data?.get("receipt") === "string" ? String(data?.get("receipt")) : "") };
  },
};
