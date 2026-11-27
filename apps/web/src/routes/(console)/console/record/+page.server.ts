import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";
import { DEFAULT_TIME_ZONE } from "#lib/zoned.js";

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  const record = service().governanceRecord(session);
  if (!record) redirect(303, "/console");
  return { record, timeZone: service().getSpace(session.spaceId)?.timeZone ?? DEFAULT_TIME_ZONE };
};
