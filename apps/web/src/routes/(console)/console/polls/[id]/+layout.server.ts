import { error, redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { localize } from "#lib/poll-i18n.js";
import { service } from "#lib/server/runtime.js";
import { needSession } from "#lib/server/web.js";

export const load: LayoutServerLoad = ({ locals, params }) => {
  const session = needSession(locals);
  if (!session.administrator) redirect(303, "/console/space");
  const poll = service().pollFor(session, params.id);
  if (!poll) error(404, "Not found");
  // The poll as the administrator reads it, in the language of the screen when the poll offers it.
  const text = localize(poll, locals.locale);
  return { poll: { ...poll, title: text.title, question: text.question, description: text.description, options: text.options } };
};
