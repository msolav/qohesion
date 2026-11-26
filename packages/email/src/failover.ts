import type { EmailMessage, EmailTransport, Lane, SendResult } from "./types.js";

export interface FailoverOptions {
  /** Lanes allowed to use the standby. The voting lane is left out by default so that an abuse event does not reach a second account. */
  readonly failoverLanes?: readonly Lane[];
}

/** Tries the primary transport, then the standby for allowed lanes when the primary cannot deliver. */
export class FailoverTransport implements EmailTransport {
  readonly name = "failover";
  private readonly lanes: readonly Lane[];

  constructor(
    private readonly primary: EmailTransport,
    private readonly standby: EmailTransport,
    options: FailoverOptions = {},
  ) {
    this.lanes = options.failoverLanes ?? ["service"];
  }

  async send(message: EmailMessage): Promise<SendResult> {
    const first = await this.primary.send(message);
    if (first.ok) return first;
    if (first.kind === "invalid_message") return first; // a standby cannot fix a wrong message
    if (!this.lanes.includes(message.lane)) return first;
    return this.standby.send(message);
  }
}
