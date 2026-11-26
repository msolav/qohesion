import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { setSessionCookie, signInLimiter } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.session) redirect(303, "/console");
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url, getClientAddress }) => {
    if (!signInLimiter.hit(getClientAddress())) return fail(429, { error: "too_many" as const });
    const data = await request.formData().catch(() => undefined);
    const key = typeof data?.get("key") === "string" ? String(data?.get("key")) : "";
    const token = key.length > 0 && key.length < 100 ? service().signIn(key) : null;
    if (!token) return fail(400, { error: "invalid" as const });
    setSessionCookie(cookies, token, url.protocol === "https:");
    redirect(303, "/console");
  },
};
