import type { EmailMessage, EmailTransport, FetchLike, SendResult } from "../src/index.js";

export const message: EmailMessage = {
  lane: "voting",
  from: { email: "noreply@mail.qohesion.app", name: "Qohesion" },
  to: { email: "member@example.org" },
  subject: "Confirmation de l'adresse / Address confirmation",
  text: "Ouvrir ce lien pour confirmer l'adresse : https://example.org/c/abc",
};

export interface Recorded { url: string; method: string; headers: Record<string, string>; body: unknown }

/** A fetch stand-in that records the request and answers with a fixed status and body. */
export function fakeFetch(status: number, json: unknown): { fetch: FetchLike; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: JSON.parse(init.body) });
    return { status, ok: status >= 200 && status < 300, json: async () => json, text: async () => JSON.stringify(json) };
  };
  return { fetch, calls };
}

export function throwingFetch(): FetchLike {
  return async () => { throw new Error("connection refused"); };
}

export function stubTransport(name: string, result: SendResult): EmailTransport & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return { name, sent, async send(m) { sent.push(m); return result; } };
}

export const ok = (provider: string): SendResult => ({ ok: true, provider, messageId: `${provider}-1` });
export const fail = (provider: string, kind: "invalid_message" | "account" | "temporary" | "budget"): SendResult => ({ ok: false, provider, kind, reason: kind });
