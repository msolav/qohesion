import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

/** The record as stored, entry by entry, with its checkpoint: it can be checked without this server. */
export const GET: RequestHandler = ({ locals }) => {
  const download = service().governanceDownload(needSession(locals));
  if (!download) error(403, "Forbidden");
  return new Response(JSON.stringify(download, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": 'attachment; filename="qohesion-record.json"', "cache-control": "no-store" },
  });
};
