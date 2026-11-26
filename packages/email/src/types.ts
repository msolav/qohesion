export type Lane = "service" | "voting";

export interface Address {
  readonly email: string;
  readonly name?: string;
}

/** One message goes to one recipient: members request their own verification email. */
export interface EmailMessage {
  /** "service": sign-in and administrator notices. "voting": verification emails of the free voting lane. */
  readonly lane: Lane;
  readonly from: Address;
  readonly to: Address;
  readonly replyTo?: Address;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  /** https address that unsubscribes in one click. Adds the List-Unsubscribe headers. */
  readonly unsubscribeUrl?: string;
  readonly unsubscribeMailto?: string;
  readonly tags?: readonly string[];
  readonly headers?: Readonly<Record<string, string>>;
}

export type FailureKind =
  /** The message itself is wrong. Never retried on another provider. */
  | "invalid_message"
  /** The provider rejects the account (key, suspension, plan). */
  | "account"
  /** Network error, rate limit or provider outage. */
  | "temporary"
  /** The daily budget of this lane is used up. */
  | "budget";

export type SendResult =
  | { readonly ok: true; readonly provider: string; readonly messageId: string }
  | { readonly ok: false; readonly provider: string; readonly kind: FailureKind; readonly reason: string; readonly status?: number };

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

/** The part of fetch that the transports use. Tests replace it. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ status: number; ok: boolean; json(): Promise<unknown>; text(): Promise<string> }>;
