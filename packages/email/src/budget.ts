import type { EmailMessage, EmailTransport, Lane, SendResult } from "./types.js";

/**
 * Daily budget shared by all messages of one provider account (Brevo free plan: 300 a day).
 * Part of it is reserved for service emails so that a large poll cannot block sign-in emails.
 * The counter is in memory; a persistent store replaces it in the application.
 */
export class DailyBudget {
  private day = "";
  private counts: Record<Lane, number> = { service: 0, voting: 0 };

  constructor(
    private readonly dailyLimit: number,
    private readonly reservedForService: number,
    private readonly clock: () => Date = () => new Date(),
  ) {
    if (reservedForService < 0 || reservedForService > dailyLimit) throw new Error("reservedForService must be between 0 and the daily limit");
  }

  private roll(): void {
    const today = this.clock().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.counts = { service: 0, voting: 0 };
    }
  }

  private total(): number {
    return this.counts.service + this.counts.voting;
  }

  tryConsume(lane: Lane): boolean {
    this.roll();
    if (this.total() >= this.dailyLimit) return false;
    if (lane === "voting" && this.counts.voting >= this.dailyLimit - this.reservedForService) return false;
    this.counts[lane]++;
    return true;
  }

  refund(lane: Lane): void {
    this.roll();
    if (this.counts[lane] > 0) this.counts[lane]--;
  }

  remaining(): { total: number; voting: number } {
    this.roll();
    return {
      total: this.dailyLimit - this.total(),
      voting: Math.max(0, Math.min(this.dailyLimit - this.total(), this.dailyLimit - this.reservedForService - this.counts.voting)),
    };
  }
}

/** Refuses a message when the lane's budget is used up, and gives the unit back when sending fails. */
export class BudgetedTransport implements EmailTransport {
  readonly name: string;

  constructor(
    private readonly inner: EmailTransport,
    private readonly budget: DailyBudget,
  ) {
    this.name = inner.name;
  }

  async send(message: EmailMessage): Promise<SendResult> {
    if (!this.budget.tryConsume(message.lane)) {
      return { ok: false, provider: this.name, kind: "budget", reason: `daily budget used up for the ${message.lane} lane` };
    }
    const result = await this.inner.send(message);
    if (!result.ok) this.budget.refund(message.lane);
    return result;
  }
}
