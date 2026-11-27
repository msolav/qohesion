import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { localize } from "#lib/poll-i18n.js";
import { isTestEdition, service } from "#lib/server/runtime.js";
import { receiptCheck, resultsPage } from "#lib/server/web.js";

export const load: PageServerLoad = ({ params, locals }) => {
  if (!isTestEdition()) error(404, "Not found");
  const link = service().byToken(params.token);
  if (!link || link.poll.status === "draft") error(404, "Not found");
  const page = resultsPage(locals, link.poll, params.token);
  if (!page.results) redirect(303, `/v/${params.token}`);
  const { poll } = link;
  return { ...page, organization: service().getSpace(poll.spaceId)?.name ?? null, poll: { id: poll.id, title: localize(poll, locals.locale).title, question: localize(poll, locals.locale).question, options: localize(poll, locals.locale).options, timing: poll.timing, audience: poll.audience, status: poll.status, markFill: poll.markFill } };
};

export const actions: Actions = {
  check: async ({ request, params, locals }) => {
    const link = service().byToken(params.token);
    if (!link) error(404, "Not found");
    const data = await request.formData().catch(() => undefined);
    return { check: receiptCheck(locals, link.poll, params.token, typeof data?.get("receipt") === "string" ? String(data?.get("receipt")) : "") };
  },
};
