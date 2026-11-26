import type { PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals, params }) => ({ items: service().history(needSession(locals), params.id) });
