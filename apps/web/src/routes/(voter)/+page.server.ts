import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { isTestEdition, service } from "#lib/server/runtime.js";

/**
 * An installation holds one organization, so its front door is not a page about the product: the first visit sets the
 * organization up, and every later visit goes to the sign-in of its administrators (or straight to the console when
 * already signed in). Members never come here: they arrive with their personal link.
 */
export const load: PageServerLoad = ({ locals }) => {
  if (!isTestEdition()) redirect(303, "/preview/ballot");
  if (!service().isSetUp()) redirect(303, "/start");
  redirect(303, locals.session ? "/console" : "/signin");
};
