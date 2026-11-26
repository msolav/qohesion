import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals, params, url }) => {
  const session = needSession(locals);
  const tokens = service().voterTokens(session, params.id);
  const entries = service().roll(session, params.id).map((e) => ({ ...e, link: `${url.origin}/v/${tokens.get(e.id) ?? ""}` }));
  return { entries };
};

export const actions: Actions = {
  add: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const text = typeof data?.get("addresses") === "string" ? String(data?.get("addresses")) : "";
    const result = service().addToRoll(session, params.id, text);
    if (!result.ok) return fail(400, { error: result.error, text });
    return { report: result.value };
  },
  remove: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const id = Number(data?.get("entry"));
    const result = service().removeFromRoll(session, params.id, Number.isInteger(id) ? id : 0);
    if (!result.ok) return fail(400, { error: result.error });
    return {};
  },
};
