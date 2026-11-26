import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isTestEdition, service } from "#lib/server/runtime.js";
import { viewerFor } from "#lib/server/web.js";

/**
 * The results of a poll as one viewer may see them. The rules of results-rules.ts apply on every request, and nothing
 * identifies the viewer in the answer. The page polls this address while a poll is open.
 */
export const GET: RequestHandler = ({ params, url, locals }) => {
  if (!isTestEdition()) error(404, "Not found");
  const poll = service().getPoll(params.pollId);
  if (!poll || poll.status === "draft") error(404, "Not found");
  const results = service().resultsFor(poll.id, viewerFor(locals, poll, url.searchParams.get("t")));
  if (!results) error(404, "Not found");
  return json(results, { headers: { "cache-control": "no-store" } });
};
