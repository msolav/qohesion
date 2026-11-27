import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { setSessionCookie } from "#lib/server/web.js";

// An installation holds one organization: this page exists for the first visit only.
export const load: PageServerLoad = ({ locals, request }) => {
  // Only a visit (GET) is turned away. The answer to the setup itself is rendered by this load too, and must show the key.
  if (request.method === "GET" && service().isSetUp() && !locals.session) redirect(303, "/signin");
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url, locals }) => {
    if (service().isSetUp()) return fail(409, { error: "already_set_up", name: "" });
    const data = await request.formData().catch(() => undefined);
    const name = typeof data?.get("name") === "string" ? String(data?.get("name")) : "";
    const result = service().createSpace({ name, locale: locals.locale });
    if (!result.ok) return fail(400, { error: result.error, name });
    const token = service().signIn(result.value.key);
    if (token) setSessionCookie(cookies, token, url.protocol === "https:");
    // The key is shown once, on this response. It is not stored in a readable form.
    return { created: true as const, key: result.value.key, name: result.value.space.name };
  },
};
