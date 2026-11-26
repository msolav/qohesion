import { isHexColor } from "./color.js";
import { hasText } from "./text.js";
import { isEmptyAnswer, validateAnswer } from "./validate.js";
import type { AnswerValue, Answers, Condition, Form, Locale, LocalizedText, Question, Step, ValidationError } from "./types.js";

export class FormDefinitionError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`Invalid form definition:\n- ${problems.join("\n- ")}`);
    this.name = "FormDefinitionError";
    this.problems = problems;
  }
}

function hasAnyText(text: LocalizedText | undefined): boolean {
  return !!text && Object.values(text).some((t) => typeof t === "string" && t.trim() !== "");
}

/** Checks the structure of a form and returns it. Throws FormDefinitionError listing every problem. */
export function defineForm(form: Form): Form {
  const problems: string[] = [];
  const stepIds = new Set<string>();
  const questionOrder = new Map<string, number>();
  let index = 0;

  if (!hasAnyText(form.title)) problems.push(`form "${form.id}": title is empty`);
  if (form.steps.length === 0) problems.push(`form "${form.id}": no steps`);

  for (const step of form.steps) {
    if (stepIds.has(step.id)) problems.push(`step "${step.id}": duplicate id`);
    stepIds.add(step.id);
    if (!hasAnyText(step.title)) problems.push(`step "${step.id}": title is empty`);
    if (step.questions.length === 0) problems.push(`step "${step.id}": no questions`);

    for (const q of step.questions) {
      const where = `question "${q.id}"`;
      if (questionOrder.has(q.id)) problems.push(`${where}: duplicate id`);
      if (!hasAnyText(q.label)) problems.push(`${where}: label is empty`);

      if (q.showIf) {
        const target = questionOrder.get(q.showIf.question);
        if (target === undefined) problems.push(`${where}: showIf refers to "${q.showIf.question}", which is not an earlier question`);
      }
      questionOrder.set(q.id, index++);

      if (q.type === "single" || q.type === "multiple") {
        if (q.options.length === 0) problems.push(`${where}: no options`);
        const ids = new Set<string>();
        for (const o of q.options) {
          if (o.id.trim() === "") problems.push(`${where}: option with an empty id`);
          if (ids.has(o.id)) problems.push(`${where}: duplicate option id "${o.id}"`);
          ids.add(o.id);
          if (!hasAnyText(o.label)) problems.push(`${where}: option "${o.id}" has no label`);
        }
      }
      if (q.type === "multiple") {
        const min = q.min ?? 0;
        const max = q.max ?? q.options.length;
        if (min < 0) problems.push(`${where}: min is negative`);
        if (min > max) problems.push(`${where}: min is greater than max`);
        if (max > q.options.length) problems.push(`${where}: max exceeds the number of options`);
      }
      if (q.type === "number" && q.min !== undefined && q.max !== undefined && q.min > q.max) {
        problems.push(`${where}: min is greater than max`);
      }
      if (q.type === "text" && q.maxLength !== undefined && q.maxLength <= 0) {
        problems.push(`${where}: maxLength must be positive`);
      }
      if (q.type === "color") {
        for (const rule of q.contrast ?? []) {
          if (!isHexColor(rule.against)) problems.push(`${where}: contrast rule with an invalid colour "${rule.against}"`);
          if (rule.minRatio < 1) problems.push(`${where}: contrast ratio below 1`);
        }
      }
    }
  }
  if (problems.length > 0) throw new FormDefinitionError(problems);
  return form;
}

function sameValue(a: AnswerValue | undefined, b: AnswerValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const x = [...(a as readonly string[])].sort();
    const y = [...(b as readonly string[])].sort();
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }
  if (Array.isArray(a)) return (a as readonly string[]).includes(b as string);
  return a === b;
}

function matches(condition: Condition, answers: Answers): boolean {
  const value = answers[condition.question];
  if (condition.equals !== undefined && !sameValue(value, condition.equals)) return false;
  if (condition.notEquals !== undefined && sameValue(value, condition.notEquals)) return false;
  if (condition.oneOf !== undefined && !condition.oneOf.some((candidate) => sameValue(value, candidate))) return false;
  return true;
}

export function isVisible(question: Question, answers: Answers): boolean {
  return question.showIf ? matches(question.showIf, answers) : true;
}

export function visibleQuestions(step: Step, answers: Answers): Question[] {
  return step.questions.filter((q) => isVisible(q, answers));
}

/** Steps with at least one visible question, in order. */
export function visibleSteps(form: Form, answers: Answers): Step[] {
  return form.steps.filter((s) => visibleQuestions(s, answers).length > 0);
}

export function nextStepId(form: Form, currentId: string, answers: Answers): string | undefined {
  const steps = visibleSteps(form, answers);
  const at = steps.findIndex((s) => s.id === currentId);
  return at >= 0 ? steps[at + 1]?.id : steps[0]?.id;
}

export function previousStepId(form: Form, currentId: string, answers: Answers): string | undefined {
  const steps = visibleSteps(form, answers);
  const at = steps.findIndex((s) => s.id === currentId);
  return at > 0 ? steps[at - 1]?.id : undefined;
}

export interface FormValidation {
  readonly ok: boolean;
  readonly errors: Readonly<Record<string, readonly ValidationError[]>>;
}

/** Validates the visible questions. Answers to hidden questions are ignored. */
export function validateForm(form: Form, answers: Answers): FormValidation {
  const errors: Record<string, readonly ValidationError[]> = {};
  for (const step of form.steps) {
    for (const q of visibleQuestions(step, answers)) {
      const found = validateAnswer(q, answers[q.id]);
      if (found.length > 0) errors[q.id] = found;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function progress(form: Form, answers: Answers): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const step of form.steps) {
    for (const q of visibleQuestions(step, answers)) {
      total++;
      const value = answers[q.id];
      if (!isEmptyAnswer(value) && validateAnswer(q, value).length === 0) answered++;
    }
  }
  return { answered, total };
}

export interface MissingTranslation {
  readonly path: string;
  readonly missing: readonly Locale[];
}

/** Lists every text that lacks a translation, so an incomplete language can be flagged before a vote opens. */
export function missingTranslations(form: Form, locales: readonly Locale[]): MissingTranslation[] {
  const out: MissingTranslation[] = [];
  const check = (path: string, text: LocalizedText | undefined) => {
    if (!text) return;
    const missing = locales.filter((l) => !hasText(text, l));
    if (missing.length > 0) out.push({ path, missing });
  };
  check(`${form.id}.title`, form.title);
  for (const step of form.steps) {
    check(`${step.id}.title`, step.title);
    check(`${step.id}.description`, step.description);
    for (const q of step.questions) {
      check(`${q.id}.label`, q.label);
      check(`${q.id}.help`, q.help);
      if (q.type === "single" || q.type === "multiple") {
        for (const o of q.options) {
          check(`${q.id}.${o.id}.label`, o.label);
          check(`${q.id}.${o.id}.help`, o.help);
        }
      }
    }
  }
  return out;
}
