// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Who sees what of a poll's results, and when (ADR 0007, section 2). Pure rules, shared by the server and the screens.
 */

export type PollStatus = "draft" | "scheduled" | "open" | "closed";
/** `close`: totals appear when the poll closes. `live`: totals appear as ballots arrive. */
export type ResultsTiming = "close" | "live";
/** Who may see the results: the administrators only, the members on the roll, or anyone with the address. */
export type ResultsAudience = "administrators" | "voters" | "anyone";
export type Viewer = "administrator" | "voter" | "anyone";

export const TIMINGS: readonly ResultsTiming[] = ["close", "live"];
export const AUDIENCES: readonly ResultsAudience[] = ["administrators", "voters", "anyone"];

export interface ResultsSettings {
  readonly status: PollStatus;
  readonly timing: ResultsTiming;
  readonly audience: ResultsAudience;
}

export interface Access {
  /** The count of ballots cast. */
  readonly turnout: boolean;
  /** The count for each option. */
  readonly totals: boolean;
}

const NOTHING: Access = { turnout: false, totals: false };

/** Whether the audience setting lets this viewer in. Administrators are always in. */
export function inAudience(audience: ResultsAudience, viewer: Viewer): boolean {
  if (viewer === "administrator") return true;
  if (audience === "anyone") return true;
  return audience === "voters" && viewer === "voter";
}

export function accessTo(poll: ResultsSettings, viewer: Viewer): Access {
  if (poll.status === "draft" || poll.status === "scheduled") return NOTHING;
  if (poll.status === "closed") {
    const allowed = inAudience(poll.audience, viewer);
    return { turnout: allowed, totals: allowed };
  }
  // Open. Until the close, administrators see the number of ballots cast and nothing else, unless results are live.
  if (poll.timing === "live") {
    const allowed = inAudience(poll.audience, viewer);
    return { turnout: allowed, totals: allowed };
  }
  return viewer === "administrator" ? { turnout: true, totals: false } : NOTHING;
}

/** A live count over a small roll can reveal how one person voted. */
export const SMALL_ROLL = 5;

export function liveResultsWarning(timing: ResultsTiming, rollSize: number): boolean {
  return timing === "live" && rollSize < SMALL_ROLL;
}

export function isTiming(value: unknown): value is ResultsTiming {
  return value === "close" || value === "live";
}
export function isAudience(value: unknown): value is ResultsAudience {
  return value === "administrators" || value === "voters" || value === "anyone";
}
