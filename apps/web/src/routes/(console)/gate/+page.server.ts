import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { safeNext, gateCookieValue, passwordMatches } from "#lib/server/gate.js";
import { gatePassword, serverSecret } from "#lib/server/runtime.js";
import { createLimiter } from "#lib/limiter.js";

const limiter = createLimiter({ max: 10, windowMs: 10 * 60_000 });

export const load: PageServerLoad = ({ url }) => {
  if (!gatePassword()) redirect(303, "/");
  return { next: safeNext(url.searchParams.get("next")) };
};

export const actions: Actions = {
  default: async ({ request, cookies, url, getClientAddress }) => {
    const password = gatePassword();
    if (!password) redirect(303, "/");
    if (!limiter.hit(getClientAddress())) return fail(429, { error: "too_many" as const });
    const data = await request.formData().catch(() => undefined);
    const entered = typeof data?.get("password") === "string" ? String(data?.get("password")) : "";
    if (!passwordMatches(entered, password)) return fail(400, { error: "invalid" as const });
    cookies.set("qg", gateCookieValue(serverSecret(), password), { path: "/", httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 30 * 24 * 3600 });
    redirect(303, safeNext(typeof data?.get("next") === "string" ? String(data?.get("next")) : null));
  },
};
