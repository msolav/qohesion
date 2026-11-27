import type { LayoutServerLoad } from "./$types";
import { QOHESION_EDITION, QOHESION_SOURCE_URL } from "$app/env/private";
import { build } from "#lib/version.js";

// The language and the template follow the address (?lang=, ?theme=), so reading them here makes this load run again when
// they change and the page can switch without a reload.
export const load: LayoutServerLoad = ({ locals, url }) => ({
  locale: (url.searchParams.get("lang"), locals.locale),
  theme: (url.searchParams.get("theme"), locals.theme),
  build,
  edition: QOHESION_EDITION,
  session: locals.session ? { label: locals.session.label, owner: locals.session.owner, administrator: locals.session.administrator } : null,
  sourceUrl: QOHESION_SOURCE_URL,
});
