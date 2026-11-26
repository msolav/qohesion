import type { LayoutServerLoad } from "./$types";
import { QOHESION_SOURCE_URL } from "$app/env/private";
import { build } from "#lib/version.js";

export const load: LayoutServerLoad = ({ locals }) => ({
  locale: locals.locale,
  theme: locals.theme,
  build,
  sourceUrl: QOHESION_SOURCE_URL,
});
