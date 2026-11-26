import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  redirect(303, session.administrator ? "/console/polls" : "/console/space");
};
