// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { redirect } from "@sveltejs/kit";
import type { Cookies } from "@sveltejs/kit";
import { createLimiter } from "../limiter.js";
import type { Poll, Session } from "./service.js";
import type { Viewer } from "../results-rules.js";
import { service } from "./runtime.js";

export const SESSION_COOKIE = "qs";
export const signInLimiter = createLimiter({ max: 10, windowMs: 10 * 60_000 });

export function needSession(locals: App.Locals): Session {
  if (!locals.session) redirect(303, "/signin");
  return locals.session;
}

export function setSessionCookie(cookies: Cookies, token: string, secure: boolean): void {
  cookies.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", secure, maxAge: 14 * 24 * 3600 });
}

/** Who is looking at a poll's results: an administrator of its space, a member with a valid personal link, or anyone. */
export function viewerFor(locals: App.Locals, poll: Poll, memberToken: string | null): Viewer {
  if (locals.session?.administrator && locals.session.spaceId === poll.spaceId) return "administrator";
  if (memberToken) {
    const member = service().viewerOfToken(memberToken);
    if (member && member.pollId === poll.id) return "voter";
  }
  return "anyone";
}

/** What a results page shows: the numbers the viewer may see and, once the poll has closed, the ledger. */
export function resultsPage(locals: App.Locals, poll: Poll, memberToken: string | null) {
  const results = service().resultsFor(poll.id, viewerFor(locals, poll, memberToken));
  const ledger = results?.access.totals && poll.status === "closed" ? service().ledger(poll.id) : null;
  const publication = results?.access.totals ? service().publication(poll.id, viewerFor(locals, poll, memberToken)) : null;
  return { results, ledger, publication };
}

/** Checks a receipt code typed in the ledger panel. Only a viewer who may see the ledger gets an answer. */
export function receiptCheck(locals: App.Locals, poll: Poll, memberToken: string | null, input: string) {
  const allowed = resultsPage(locals, poll, memberToken).ledger !== null;
  const found = allowed ? service().checkReceipt(poll.id, input) : null;
  return { input, found };
}
