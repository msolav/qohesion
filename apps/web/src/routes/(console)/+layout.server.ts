import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { isTestEdition, service } from "#lib/server/runtime.js";

/** The owner and administrator screens exist only in the test edition (ADR 0007). */
export const load: LayoutServerLoad = ({ locals }) => {
  if (!isTestEdition()) error(404, "Not found");
  return {
    spaceName: locals.session ? (service().getSpace(locals.session.spaceId)?.name ?? null) : null,
    // Requests that wait for this key's answer, for the badge in the navigation.
    waiting: locals.session ? service().approvalsWaiting(locals.session) : 0,
  };
};
