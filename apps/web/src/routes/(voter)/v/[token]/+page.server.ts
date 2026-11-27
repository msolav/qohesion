import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { accessTo } from "#lib/results-rules.js";
import { localize } from "#lib/poll-i18n.js";
import { isTestEdition, service } from "#lib/server/runtime.js";

export const load: PageServerLoad = ({ params, locals, url }) => {
  if (!isTestEdition()) error(404, "Not found");
  const link = service().byToken(params.token);
  if (!link) return { state: "unknown" as const, organization: null };
  const { poll, status } = link;
  const space = service().getSpace(poll.spaceId);
  // The poll as the member reads it: in their language when it is offered, else in the default one.
  const text = localize(poll, locals.locale);
  const base = {
    organization: poll.organization,
    poll: { id: poll.id, title: text.title, question: text.question, description: text.description, options: text.options, questions: text.questions, timing: poll.timing, audience: poll.audience, closesAt: poll.closesAt, rollCount: poll.rollCount, rollCode: poll.rollCode, encrypted: poll.encrypted, markFill: poll.markFill, anonymity: poll.anonymity, allowChange: poll.allowChange, lateRoll: poll.lateRoll, publishCount: poll.publishCount, lockCancel: poll.lockCancel, disclosure: poll.disclosure, approval: poll.approval, paged: poll.paged && url.searchParams.get("view") !== "all", rules: poll.rules, cancelled: poll.cancelled, closedAt: poll.closedAt, timeZone: space?.timeZone ?? "America/Toronto", opensAt: poll.opensAt },
    canSeeResults: accessTo(poll, "voter").totals || poll.status === "closed",
  };
  if (poll.status === "cancelled") return { state: "cancelled" as const, ...base };
  if (poll.status === "draft" || poll.status === "scheduled") return { state: "not_open" as const, ...base };
  if (poll.status === "closed") return { state: "closed" as const, ...base };
  // Where a vote can be changed, a member who has voted sees the ballot again, with a reminder.
  if (status === "voted" && poll.allowChange) return { state: "ballot" as const, alreadyVoted: true, ...base };
  return { state: status === "voted" ? ("voted" as const) : ("ballot" as const), alreadyVoted: false, ...base };
};

export const actions: Actions = {
  default: async ({ request, params }) => {
    if (!isTestEdition()) error(404, "Not found");
    const data = await request.formData().catch(() => undefined);
    // One value for each question, in a field named a_<question id>. Several values for one question are refused for it.
    const answers: Record<string, string> = {};
    for (const key of new Set(data ? [...data.keys()] : [])) {
      if (!key.startsWith("a_")) continue;
      const values = data?.getAll(key) ?? [];
      if (values.length !== 1 || typeof values[0] !== "string") return fail(400, { error: "invalid_type", question: key.slice(2) });
      answers[key.slice(2)] = values[0];
    }
    // A page loaded before the questions had their own fields posts `choice`, which is the answer of a poll of one question.
    const legacy = data?.get("choice");
    const result = service().castBallot(params.token, Object.keys(answers).length > 0 ? answers : typeof legacy === "string" && legacy !== "" ? legacy : {});
    if (!result.ok) return fail(400, { error: result.error, ...(result.question === undefined ? {} : { question: result.question }) });
    return { receipt: result.value.receipt };
  },
};
