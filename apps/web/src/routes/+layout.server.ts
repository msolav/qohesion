import type { LayoutServerLoad } from "./$types";
import { QOHESION_EDITION, QOHESION_SOURCE_URL } from "$app/env/private";
import { build } from "#lib/version.js";

export const load: LayoutServerLoad = ({ locals }) => ({
  locale: locals.locale,
  theme: locals.theme,
  build,
  edition: QOHESION_EDITION,
  session: locals.session ? { label: locals.session.label, owner: locals.session.owner, administrator: locals.session.administrator } : null,
  sourceUrl: QOHESION_SOURCE_URL,
});
