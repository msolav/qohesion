import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { parsePollForm } from "#lib/poll-form.js";
import { service } from "#lib/server/runtime.js";
import { DEFAULT_TIME_ZONE } from "#lib/zoned.js";
import { needSession } from "#lib/server/web.js";

export const load: PageServerLoad = ({ locals, params, parent }) => {
  const session = needSession(locals);
  const poll = service().pollFor(session, params.id);
  if (!poll || poll.status !== "draft") redirect(303, `/console/polls/${params.id}`);
  void parent;
  const timeZone = service().getSpace(session.spaceId)?.timeZone ?? DEFAULT_TIME_ZONE;
  return {
    timeZone,
    administrators: service().listKeys({ ...session, owner: true }).filter((k) => k.administrator && !k.revokedAt).length,
    input: {
      title: poll.title,
      question: poll.question,
      description: poll.description,
      kind: poll.kind,
      options: poll.kind === "choice" ? poll.options.map((o) => ({ label: o.label ?? "", icon: o.icon ?? null, color: o.color ?? null })) : [],
      timing: poll.timing,
      audience: poll.audience,
      theme: poll.theme,
      opensAt: poll.opensAt,
      closesAt: poll.closesAt ?? "",
      rules: poll.rules,
      allowChange: poll.allowChange,
      encrypted: poll.encrypted,
      markFill: poll.markFill,
      anonymity: poll.anonymity,
      autoReminder: poll.autoReminder,
      publishCount: poll.publishCount,
      lockCancel: poll.lockCancel,
      paged: poll.paged,
      lateRoll: poll.lateRoll,
      keyThreshold: poll.keyThreshold,
      reminderPermission: poll.autoReminder !== "none",
      translations: poll.translations,
    },
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    if (!data) return fail(400, { error: "invalid_type", input: null });
    const input = parsePollForm(data, service().getSpace(session.spaceId)?.timeZone ?? DEFAULT_TIME_ZONE);
    const result = service().updatePoll(session, params.id, input);
    if (!result.ok) return fail(400, { error: result.error, input });
    redirect(303, `/console/polls/${params.id}`);
  },
};
