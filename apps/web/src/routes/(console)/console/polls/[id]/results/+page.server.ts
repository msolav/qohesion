import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession, receiptCheck, resultsPage } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals, params }) => {
  const poll = service().pollFor(needSession(locals), params.id);
  if (!poll) error(404, "Not found");
  return resultsPage(locals, poll, null);
};

export const actions: Actions = {
  check: async ({ request, locals, params }) => {
    const poll = service().pollFor(needSession(locals), params.id);
    if (!poll) error(404, "Not found");
    const data = await request.formData().catch(() => undefined);
    return { check: receiptCheck(locals, poll, null, typeof data?.get("receipt") === "string" ? String(data?.get("receipt")) : "") };
  },
};
