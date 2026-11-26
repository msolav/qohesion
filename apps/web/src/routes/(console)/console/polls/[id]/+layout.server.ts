import { error, redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: LayoutServerLoad = ({ locals, params }) => {
  const session = needSession(locals);
  if (!session.administrator) redirect(303, "/console/space");
  const poll = service().pollFor(session, params.id);
  if (!poll) error(404, "Not found");
  return { poll };
};
