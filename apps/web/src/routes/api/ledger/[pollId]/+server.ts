import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isTestEdition, service } from "#lib/server/runtime.js";
import { viewerFor } from "#lib/server/web.js";

/**
 * The ledger of a poll that publishes its count, for someone who recounts: every entry with its receipt code, the root, and
 * the counting key of a sealed poll. It answers only to those who may see the totals, and only after the count.
 */
export const GET: RequestHandler = ({ params, url, locals }) => {
  if (!isTestEdition()) error(404, "Not found");
  const poll = service().getPoll(params.pollId);
  if (!poll) error(404, "Not found");
  const viewer = viewerFor(locals, poll, url.searchParams.get("t"));
  const publication = service().publication(poll.id, viewer);
  const entries = service().ledgerEntries(poll.id, viewer);
  if (!publication || !entries) error(404, "Not found");
  return json({ poll: poll.id, root: publication.root, size: entries.length, countingKey: publication.countingKey, entries }, { headers: { "cache-control": "no-store", "content-disposition": `attachment; filename="ledger-${poll.id}.json"` } });
};
