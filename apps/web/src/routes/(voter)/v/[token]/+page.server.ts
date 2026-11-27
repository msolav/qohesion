import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { accessTo } from "#lib/results-rules.js";
import { isTestEdition, service } from "#lib/server/runtime.js";

export const load: PageServerLoad = ({ params }) => {
  if (!isTestEdition()) error(404, "Not found");
  const link = service().byToken(params.token);
  if (!link) return { state: "unknown" as const, organization: null };
  const { poll, status } = link;
  const space = service().getSpace(poll.spaceId);
  const base = {
    organization: space?.name ?? null,
    poll: { id: poll.id, title: poll.title, description: poll.description, options: poll.options, timing: poll.timing, audience: poll.audience, closesAt: poll.closesAt, rollCount: poll.rollCount, rollCode: poll.rollCode, encrypted: poll.encrypted, markFill: poll.markFill, allowChange: poll.allowChange, rules: poll.rules, timeZone: space?.timeZone ?? "America/Toronto", opensAt: poll.opensAt },
    canSeeResults: accessTo(poll, "voter").totals || poll.status === "closed",
  };
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
    const values = data?.getAll("choice").map((v) => (typeof v === "string" ? v : "")) ?? [];
    // One value for a single-choice question. Several values are refused as they are.
    const choice = values.length === 1 && values[0] !== "" ? values[0] : values.length > 1 ? values.join(",") : undefined;
    const result = service().castBallot(params.token, choice);
    if (!result.ok) return fail(400, { error: result.error });
    return { receipt: result.value.receipt };
  },
};
