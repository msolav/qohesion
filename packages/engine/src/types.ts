/** A text in several languages, keyed by language tag ("fr", "en", "fr-CA"). */
export type Locale = string;
export type LocalizedText = Readonly<Record<Locale, string>>;

export type AnswerValue = string | number | boolean | readonly string[];
export type Answers = Readonly<Record<string, AnswerValue | undefined>>;

/** Shows a question only when an earlier answer matches. */
export interface Condition {
  readonly question: string;
  readonly equals?: AnswerValue;
  readonly notEquals?: AnswerValue;
  readonly oneOf?: readonly AnswerValue[];
}

interface QuestionBase {
  readonly id: string;
  readonly label: LocalizedText;
  readonly help?: LocalizedText;
  readonly required?: boolean;
  readonly showIf?: Condition;
}

export interface Option {
  readonly id: string;
  readonly label: LocalizedText;
  readonly help?: LocalizedText;
}

export interface SingleChoiceQuestion extends QuestionBase {
  readonly type: "single";
  readonly options: readonly Option[];
}
export interface MultipleChoiceQuestion extends QuestionBase {
  readonly type: "multiple";
  readonly options: readonly Option[];
  readonly min?: number;
  readonly max?: number;
}
export interface TextQuestion extends QuestionBase {
  readonly type: "text";
  readonly maxLength?: number;
  readonly multiline?: boolean;
}
export interface NumberQuestion extends QuestionBase {
  readonly type: "number";
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
}
export interface ContrastRule {
  /** Background colour, "#rrggbb". */
  readonly against: string;
  readonly minRatio: number;
}
export interface ColorQuestion extends QuestionBase {
  readonly type: "color";
  readonly contrast?: readonly ContrastRule[];
}
export interface ToggleQuestion extends QuestionBase {
  readonly type: "toggle";
}

export type Question =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | TextQuestion
  | NumberQuestion
  | ColorQuestion
  | ToggleQuestion;

export interface Step {
  readonly id: string;
  readonly title: LocalizedText;
  readonly description?: LocalizedText;
  readonly questions: readonly Question[];
}

export interface Form {
  readonly id: string;
  readonly title: LocalizedText;
  readonly steps: readonly Step[];
}

export type ErrorCode =
  | "required"
  | "invalid_type"
  | "unknown_option"
  | "duplicate_option"
  | "too_few"
  | "too_many"
  | "too_long"
  | "not_a_number"
  | "not_an_integer"
  | "below_min"
  | "above_max"
  | "invalid_color"
  | "low_contrast";

/** Errors carry a code and parameters. The interface turns them into text in the displayed language. */
export interface ValidationError {
  readonly code: ErrorCode;
  readonly params?: Readonly<Record<string, string | number>>;
}
