import type { LayoutServerLoad } from "./$types";
import { build } from "#lib/version.js";

export const load: LayoutServerLoad = ({ locals }) => ({
  locale: locals.locale,
  theme: locals.theme,
  build,
});
