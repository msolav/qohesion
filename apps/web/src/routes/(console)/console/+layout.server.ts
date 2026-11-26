import type { LayoutServerLoad } from "./$types";
import { needSession } from "#lib/server/web.js";

/** Every screen under /console needs a signed-in key. */
export const load: LayoutServerLoad = ({ locals }) => {
  needSession(locals);
  return {};
};
