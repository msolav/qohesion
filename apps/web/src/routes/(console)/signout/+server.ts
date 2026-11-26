import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { service } from "#lib/server/runtime.js";
import { SESSION_COOKIE } from "#lib/server/web.js";

export const POST: RequestHandler = ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE);
  if (token) service().signOut(token);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  redirect(303, "/signin");
};
