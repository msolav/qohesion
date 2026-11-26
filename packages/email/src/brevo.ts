import { buildHeaders, validateMessage } from "./message.js";
import type { Address, EmailMessage, EmailTransport, FailureKind, FetchLike, SendResult } from "./types.js";

export interface BrevoOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
}

const pick = (a: Address) => (a.name ? { email: a.email, name: a.name } : { email: a.email });

/** Sends raw text and HTML through Brevo's transactional API. No Brevo template is used. */
export class BrevoTransport implements EmailTransport {
  readonly name = "brevo";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly doFetch: FetchLike;

  constructor(options: BrevoOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.brevo.com";
    const f = options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
    if (!f) throw new Error("No fetch available");
    this.doFetch = f;
  }

  async send(message: EmailMessage): Promise<SendResult> {
    const problems = validateMessage(message);
    if (problems.length > 0) return { ok: false, provider: this.name, kind: "invalid_message", reason: problems.join("; ") };

    const headers = buildHeaders(message);
    const body: Record<string, unknown> = {
      sender: pick(message.from),
      to: [pick(message.to)],
      subject: message.subject,
      textContent: message.text,
    };
    if (message.html) body.htmlContent = message.html;
    if (message.replyTo) body.replyTo = pick(message.replyTo);
    if (Object.keys(headers).length > 0) body.headers = headers;
    if (message.tags && message.tags.length > 0) body.tags = [...message.tags];

    let response;
    try {
      response = await this.doFetch(`${this.baseUrl}/v3/smtp/email`, {
        method: "POST",
        headers: { "api-key": this.apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      return { ok: false, provider: this.name, kind: "temporary", reason: `network error: ${(error as Error).message}` };
    }

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as { messageId?: unknown };
      return { ok: true, provider: this.name, messageId: typeof data.messageId === "string" ? data.messageId : "unknown" };
    }
    const detail = (await response.json().catch(() => ({}))) as { message?: unknown };
    const reason = typeof detail.message === "string" ? detail.message : `HTTP ${response.status}`;
    return { ok: false, provider: this.name, kind: classify(response.status), reason, status: response.status };
  }
}

function classify(status: number): FailureKind {
  if (status === 401 || status === 402 || status === 403) return "account";
  if (status === 429 || status >= 500) return "temporary";
  return "invalid_message";
}
