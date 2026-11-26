/**
 * Status of one address on the roll, and the events that change it (ADR 0003, section 4).
 * The administrator sees one status per address. "Voted" says that a ballot was cast, never which one.
 */

export type MemberStatus = "listed" | "requested" | "confirmed" | "voted" | "withdrawn" | "bounced" | "blocked";
export type RollPhase = "registration" | "frozen" | "voting" | "closed";
export type MemberEvent = "request" | "confirm" | "cast" | "withdraw" | "bounce" | "complain" | "block" | "correct_address";

export interface EventOptions {
  /** One-step informal polls: registration stays open while voting. */
  readonly lateRegistration?: boolean;
}

export type Transition =
  | { readonly ok: true; readonly status: MemberStatus; readonly changed: boolean }
  | { readonly ok: false; readonly reason: "closed" | "phase" | "transition" };

const yes = (from: MemberStatus, status: MemberStatus): Transition => ({ ok: true, status, changed: from !== status });
const no = (reason: "closed" | "phase" | "transition"): Transition => ({ ok: false, reason });

/**
 * Applies an event to a status in a phase. Idempotent events (a link opened twice, a bounce for an address that is
 * already registered) succeed without a change.
 */
export function applyEvent(status: MemberStatus, event: MemberEvent, phase: RollPhase, options: EventOptions = {}): Transition {
  if (phase === "closed") return no("closed");
  const registrationOpen = phase === "registration" || (phase === "voting" && options.lateRegistration === true);

  switch (event) {
    case "request": // the member asks for their verification email through the shared link
      if (status === "listed" || status === "requested" || status === "withdrawn" || status === "blocked") {
        return registrationOpen ? yes(status, "requested") : no("phase");
      }
      if (status === "confirmed") return yes(status, "confirmed"); // link sent again, nothing changes
      return no("transition"); // voted, bounced (the address must be corrected first)

    case "confirm":
      if (status === "confirmed") return yes(status, "confirmed");
      if (status !== "requested") return no("transition");
      return registrationOpen ? yes(status, "confirmed") : no("phase");

    case "cast":
      if (status !== "confirmed") return no("transition"); // includes a second ballot
      return phase === "voting" ? yes(status, "voted") : no("phase");

    case "withdraw":
      if (status === "withdrawn") return yes(status, "withdrawn");
      if (status === "requested" || status === "confirmed") return yes(status, "withdrawn");
      return no("transition"); // listed (nothing to withdraw from) or voted (a ballot cannot be taken back)

    case "bounce":
      if (status === "listed" || status === "requested") return yes(status, "bounced");
      return yes(status, status);

    case "complain": // a report of unwanted mail: the address leaves the poll
      if (status === "requested" || status === "confirmed") return yes(status, "withdrawn");
      if (status === "listed") return yes(status, "blocked");
      return yes(status, status);

    case "block": // "no more unprompted mail"; a registered member keeps the right to vote
      if (status === "listed" || status === "requested" || status === "withdrawn") return yes(status, "blocked");
      return yes(status, status); // a bounced address stays bounced: it must be corrected first

    case "correct_address": // the administrator replaced a bounced address
      if (status !== "bounced") return no("transition");
      return registrationOpen ? yes(status, "listed") : no("phase");
  }
}

export function canVote(status: MemberStatus, phase: RollPhase): boolean {
  return status === "confirmed" && phase === "voting";
}

/** An address counts in the registered total once confirmed, and stays counted after voting. */
export function isRegistered(status: MemberStatus): boolean {
  return status === "confirmed" || status === "voted";
}

export function registeredCount(statuses: Iterable<MemberStatus>): number {
  let n = 0;
  for (const s of statuses) if (isRegistered(s)) n++;
  return n;
}

/** Counts per status for the administrator's summary. */
export function summarize(statuses: Iterable<MemberStatus>): Record<MemberStatus, number> {
  const counts: Record<MemberStatus, number> = { listed: 0, requested: 0, confirmed: 0, voted: 0, withdrawn: 0, bounced: 0, blocked: 0 };
  for (const s of statuses) counts[s]++;
  return counts;
}
