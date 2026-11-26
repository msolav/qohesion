import { contrastRatio, isHexColor } from "./color.js";
import type { AnswerValue, ErrorCode, Question, ValidationError } from "./types.js";

function fail(code: ErrorCode, params?: Record<string, string | number>): ValidationError {
  return params ? { code, params } : { code };
}

export function isEmptyAnswer(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Checks one answer against its question. An optional question accepts an empty answer. */
export function validateAnswer(question: Question, value: AnswerValue | undefined): ValidationError[] {
  if (isEmptyAnswer(value)) return question.required ? [fail("required")] : [];
  const v = value as AnswerValue;

  switch (question.type) {
    case "single": {
      if (typeof v !== "string") return [fail("invalid_type")];
      return question.options.some((o) => o.id === v) ? [] : [fail("unknown_option", { value: v })];
    }
    case "multiple": {
      if (!Array.isArray(v) || (v as readonly unknown[]).some((x) => typeof x !== "string")) {
        return [fail("invalid_type")];
      }
      const chosen = v as readonly string[];
      const known = new Set(question.options.map((o) => o.id));
      const seen = new Set<string>();
      const errors: ValidationError[] = [];
      for (const id of chosen) {
        if (!known.has(id)) errors.push(fail("unknown_option", { value: id }));
        else if (seen.has(id)) errors.push(fail("duplicate_option", { value: id }));
        seen.add(id);
      }
      const min = question.min ?? 0;
      const max = question.max ?? question.options.length;
      if (chosen.length < min) errors.push(fail("too_few", { min }));
      if (chosen.length > max) errors.push(fail("too_many", { max }));
      return errors;
    }
    case "text": {
      if (typeof v !== "string") return [fail("invalid_type")];
      if (question.maxLength !== undefined && v.length > question.maxLength) {
        return [fail("too_long", { max: question.maxLength })];
      }
      return [];
    }
    case "number": {
      if (typeof v !== "number" || !Number.isFinite(v)) return [fail("not_a_number")];
      const errors: ValidationError[] = [];
      if (question.integer && !Number.isInteger(v)) errors.push(fail("not_an_integer"));
      if (question.min !== undefined && v < question.min) errors.push(fail("below_min", { min: question.min }));
      if (question.max !== undefined && v > question.max) errors.push(fail("above_max", { max: question.max }));
      return errors;
    }
    case "color": {
      if (typeof v !== "string" || !isHexColor(v)) return [fail("invalid_color")];
      const errors: ValidationError[] = [];
      for (const rule of question.contrast ?? []) {
        const ratio = contrastRatio(v, rule.against);
        if (ratio < rule.minRatio) {
          errors.push(fail("low_contrast", { ratio: Math.round(ratio * 10) / 10, min: rule.minRatio, against: rule.against }));
        }
      }
      return errors;
    }
    case "toggle":
      return typeof v === "boolean" ? [] : [fail("invalid_type")];
  }
}
