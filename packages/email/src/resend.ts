import { buildHeaders, formatAddress, validateMessage } from "./message.js";
import type { EmailMessage, EmailTransport, FailureKind, FetchLike, SendResult } from "./types.js";

export interface ResendOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
}

/** Standby transport for service emails. */
export class ResendTransport implements EmailTransport {
  readonly name = "resend";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly doFetch: FetchLike;

  constructor(options: ResendOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.resend.com";
    const f = options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!f) throw new Error("No fetch available");
    this.doFetch = f;
  }

  async send(message: EmailMessage): Promise<SendResult> {
    const problems = validateMessage(message);
    if (problems.length > 0) return { ok: false, provider: this.name, kind: "invalid_message", reason: problems.join("; ") };

    const headers = buildHeaders(message);
    const body: Record<string, unknown> = {
      from: formatAddress(message.from),
      to: [message.to.email],
      subject: message.subject,
      text: message.text,
    };
    if (message.html) body.html = message.html;
    if (message.replyTo) body.reply_to = message.replyTo.email;
    if (Object.keys(headers).length > 0) body.headers = headers;
    if (message.tags && message.tags.length > 0) body.tags = message.tags.map((value, i) => ({ name: `tag${i + 1}`, value }));

    let response;
    try {
      response = await this.doFetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      return { ok: false, provider: this.name, kind: "temporary", reason: `network error: ${(error as Error).message}` };
    }

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as { id?: unknown };
      return { ok: true, provider: this.name, messageId: typeof data.id === "string" ? data.id : "unknown" };
    }
    const detail = (await response.json().catch(() => ({}))) as { message?: unknown };
    const reason = typeof detail.message === "string" ? detail.message : `HTTP ${response.status}`;
    return { ok: false, provider: this.name, kind: classify(response.status), reason, status: response.status };
  }
}

function classify(status: number): FailureKind {
  if (status === 401 || status === 403) return "account";
  if (status === 429 || status >= 500) return "temporary";
  return "invalid_message";
}
