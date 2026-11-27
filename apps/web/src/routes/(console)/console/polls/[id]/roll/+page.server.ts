import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { service } from "#lib/server/runtime.js";
import { consoleMessages } from "#lib/i18n/console.js";
import { mailConfigured, sendInvitations } from "#lib/server/mail.js";
import { needSession } from "#lib/server/web.js";
import { mayWrite, writeAgainAt } from "#lib/auto-reminder.js";

export const load: PageServerLoad = ({ locals, params, url }) => {
  const open = service().pollFor(needSession(locals), params.id)?.status === "open";
  const session = needSession(locals);
  const tokens = service().voterTokens(session, params.id);
  const now = new Date();
  // For a participant already written to: when the next message may go out (null when it may go out now).
  const entries = service().roll(session, params.id).map((e) => ({ ...e, link: `${url.origin}/v/${tokens.get(e.id) ?? ""}`, writeAgainAt: e.invitedAt && !mayWrite(e.invitedAt, now) ? writeAgainAt(e.invitedAt).toISOString() : null }));
  const wait = service().reminderWait(session, params.id);
  return {
    entries,
    mailConfigured: mailConfigured(),
    canSend: open && mailConfigured(),
    // How many can be written to now, and when the next reminder becomes possible.
    timeZone: service().getSpace(session.spaceId)?.timeZone ?? "America/Toronto",
    toSend: { new: service().invitees(session, params.id, "new").length, reminder: service().invitees(session, params.id, "reminder").length },
    reminderAt: wait ? wait.toISOString() : null,
  };
};

export const actions: Actions = {
  add: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const text = typeof data?.get("addresses") === "string" ? String(data?.get("addresses")) : "";
    const result = service().addToRoll(session, params.id, text);
    if (!result.ok) return fail(400, { error: result.error, text });
    return { report: result.value };
  },
  send: async ({ request, locals, params, url }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    if (!mailConfigured()) return fail(400, { mailError: "mail_not_configured" });
    if (data?.get("permission") !== "yes") return fail(400, { mailError: "attestation_required" });
    const poll = service().pollFor(session, params.id);
    if (!poll || poll.status !== "open") return fail(400, { mailError: "not_open" });
    const raw = String(data?.get("which") ?? "new");
    const which = raw === "reminder" || raw === "new" ? raw : Number.isInteger(Number(raw)) ? Number(raw) : "new";
    const targets = service().invitees(session, params.id, which).slice(0, 100);
    // One participant who cannot be written to yet: say why, rather than that there is nobody.
    if (typeof which === "number" && targets.length === 0 && service().roll(session, params.id).some((e) => e.id === which && e.status !== "voted")) return fail(400, { mailError: "reminder_wait" });
    const space = service().getSpace(poll.spaceId);
    const locale = space?.locale ?? "fr";
    const m = consoleMessages[locale];
    const report = await sendInvitations(
      targets.map((t) => ({ id: t.id, address: t.address, link: `${url.origin}/v/${t.token}` })),
      {
        locale,
        organization: poll.organization,
        poll: poll.title,
        closesAt: poll.closesAt,
        timeZone: space?.timeZone ?? "America/Toronto",
        // A message to someone who already got a link is a reminder, whichever button sent it.
        reminder: which === "reminder" || (typeof which === "number" && (service().roll(session, params.id).find((e) => e.id === which)?.invites ?? 0) > 0),
        ballotStatement: poll.encrypted ? m.seal.ballotSealed : m.seal.ballotPlain,
        resultsStatement: m.resultsStatement[poll.timing][poll.audience],
      },
    );
    service().markInvited(session, params.id, report.sent);
    return { mailReport: { sent: report.sent.length, failed: report.failed, problem: report.firstProblem, nobody: targets.length === 0 } };
  },
  remove: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const id = Number(data?.get("entry"));
    const result = service().removeFromRoll(session, params.id, Number.isInteger(id) ? id : 0);
    if (!result.ok) return fail(400, { error: result.error });
    return {};
  },
};
