import { fail } from "@sveltejs/kit";
import { validateForm, type Answers, type ValidationError } from "@qohesion/engine";
import type { Actions, PageServerLoad } from "./$types";
import { previewBallot } from "#lib/ballot.js";
import { messages } from "#lib/i18n/messages.js";

export const load: PageServerLoad = ({ locals }) => ({
  organization: messages[locals.locale].preview.organization,
});

const noErrors: Readonly<Record<string, readonly ValidationError[]>> = {};

export const actions: Actions = {
  /** Validates the answer with the engine. The preview records nothing. */
  default: async ({ request }) => {
    const data = await request.formData();
    // One value for a single-choice question. Several values, or a file, are passed on as they are and refused by the engine.
    const values = data.getAll("choice").map((v) => (typeof v === "string" ? v : ""));
    const answers: Answers = { choice: values.length === 0 || (values.length === 1 && values[0] === "") ? undefined : values.length === 1 ? values[0] : values };
    const result = validateForm(previewBallot, answers);
    if (!result.ok) return fail(400, { ok: false as const, errors: result.errors });
    return { ok: true as const, errors: noErrors };
  },
};
