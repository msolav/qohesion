/**
 * Administrator setup and the assurance level shown on each vote (ADR 0003, sections 3 and 4).
 * The level follows the configuration. It is never chosen by hand, so the label stays honest.
 */

export type AssuranceLevel = "informal" | "formal" | "reinforced";

export type SetupError = "no_administrator" | "threshold_below_one" | "threshold_above_administrators" | "not_an_integer";
export type SetupWarning =
  | "single_administrator"          // one person holds the whole key: no protection, no recovery
  | "either_can_open_alone"         // 2 administrators, 1 needed: any one of them can read the votes
  | "both_required_no_redundancy"   // 2 administrators, 2 needed: one lost key loses the vote
  | "any_single_can_open"           // many administrators, 1 needed
  | "no_redundancy";                // all administrators needed

export interface SetupCheck {
  readonly valid: boolean;
  readonly errors: readonly SetupError[];
  readonly warnings: readonly SetupWarning[];
}

/** Checks the number of administrators and how many are needed to open the count ("k of n"). */
export function checkAdminSetup(administrators: number, threshold: number): SetupCheck {
  const errors: SetupError[] = [];
  const warnings: SetupWarning[] = [];
  if (!Number.isInteger(administrators) || !Number.isInteger(threshold)) errors.push("not_an_integer");
  else {
    if (administrators < 1) errors.push("no_administrator");
    if (threshold < 1) errors.push("threshold_below_one");
    if (threshold > administrators) errors.push("threshold_above_administrators");
  }
  if (errors.length === 0) {
    if (administrators === 1) warnings.push("single_administrator");
    else if (administrators === 2 && threshold === 1) warnings.push("either_can_open_alone");
    else if (administrators === 2 && threshold === 2) warnings.push("both_required_no_redundancy");
    else if (threshold === 1) warnings.push("any_single_can_open");
    else if (threshold === administrators) warnings.push("no_redundancy");
  }
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * The usual recommendation: a majority, and never all of them. 3 gives 2, 5 gives 3. One administrator gives 1 (with a
 * warning). Two administrators have no sound choice, so the result is null and the advice is to add a third.
 */
export function recommendedThreshold(administrators: number): number | null {
  if (!Number.isInteger(administrators) || administrators < 1 || administrators === 2) return null;
  if (administrators === 1) return 1;
  return Math.min(administrators - 1, Math.floor(administrators / 2) + 1);
}

export interface AssuranceInput {
  readonly administrators: number;
  readonly threshold: number;
  /** Members register for the vote before it opens. */
  readonly registration: boolean;
  /** The other administrators co-signed the frozen roll. */
  readonly rollCoSigned: boolean;
  /** Checkpoints are timestamped by an outside party. */
  readonly anchored: boolean;
}

export type Missing =
  | "three_administrators" | "threshold_two" | "threshold_below_all" | "registration" | "roll_co_signed"
  | "five_administrators" | "threshold_three" | "anchored";

export interface Assurance {
  readonly level: AssuranceLevel;
  readonly setup: SetupCheck;
  /** What the configuration lacks to reach the next level. Empty at the highest level. */
  readonly missingForNext: readonly Missing[];
}

function missingForFormal(i: AssuranceInput): Missing[] {
  const m: Missing[] = [];
  if (i.administrators < 3) m.push("three_administrators");
  if (i.threshold < 2) m.push("threshold_two");
  if (i.threshold > Math.max(1, i.administrators - 1)) m.push("threshold_below_all");
  if (!i.registration) m.push("registration");
  if (!i.rollCoSigned) m.push("roll_co_signed");
  return m;
}

export function assuranceLevel(input: AssuranceInput): Assurance {
  const setup = checkAdminSetup(input.administrators, input.threshold);
  if (!setup.valid) return { level: "informal", setup, missingForNext: missingForFormal(input) };

  const formal = missingForFormal(input);
  if (formal.length > 0) return { level: "informal", setup, missingForNext: formal };

  const reinforced: Missing[] = [];
  if (input.administrators < 5) reinforced.push("five_administrators");
  if (input.threshold < 3) reinforced.push("threshold_three");
  if (!input.anchored) reinforced.push("anchored");
  return reinforced.length > 0
    ? { level: "formal", setup, missingForNext: reinforced }
    : { level: "reinforced", setup, missingForNext: [] };
}
