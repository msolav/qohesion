import { describe, expect, it } from "vitest";
import { BrevoTransport, ResendTransport } from "../src/index.js";
import { fakeFetch, message, throwingFetch } from "./helpers.js";

describe("BrevoTransport", () => {
  it("posts raw text and HTML to the transactional API with the key in a header", async () => {
    const { fetch, calls } = fakeFetch(201, { messageId: "<abc@brevo>" });
    const t = new BrevoTransport({ apiKey: "KEY", fetch });
    const r = await t.send({ ...message, html: "<p>Bonjour</p>", replyTo: { email: "admin@example.org" }, tags: ["verification"], unsubscribeUrl: "https://example.org/u/1" });
    expect(r).toEqual({ ok: true, provider: "brevo", messageId: "<abc@brevo>" });
    const call = calls[0]!;
    expect(call.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(call.headers["api-key"]).toBe("KEY");
    expect(call.body).toMatchObject({
      sender: { email: "noreply@mail.qohesion.app", name: "Qohesion" },
      to: [{ email: "member@example.org" }],
      replyTo: { email: "admin@example.org" },
      textContent: message.text,
      htmlContent: "<p>Bonjour</p>",
      tags: ["verification"],
      headers: { "List-Unsubscribe": "<https://example.org/u/1>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    expect(call.body).not.toHaveProperty("templateId");
  });
  it("never sends an invalid message", async () => {
    const { fetch, calls } = fakeFetch(201, {});
    const r = await new BrevoTransport({ apiKey: "K", fetch }).send({ ...message, to: { email: "bad" } });
    expect(r).toMatchObject({ ok: false, kind: "invalid_message" });
    expect(calls).toHaveLength(0);
  });
  it.each([[400, "invalid_message"], [401, "account"], [402, "account"], [403, "account"], [429, "temporary"], [500, "temporary"], [503, "temporary"]] as const)(
    "classifies HTTP %i as %s", async (status, kind) => {
      const { fetch } = fakeFetch(status, { message: "nope" });
      const r = await new BrevoTransport({ apiKey: "K", fetch }).send(message);
      expect(r).toMatchObject({ ok: false, kind, status, reason: "nope" });
    });
  it("treats a network error as temporary", async () => {
    const r = await new BrevoTransport({ apiKey: "K", fetch: throwingFetch() }).send(message);
    expect(r).toMatchObject({ ok: false, kind: "temporary" });
  });
  it("never puts the key in a result", async () => {
    const { fetch } = fakeFetch(401, { message: "Key not found" });
    const r = await new BrevoTransport({ apiKey: "SECRET-KEY", fetch }).send(message);
    expect(JSON.stringify(r)).not.toContain("SECRET-KEY");
  });
});

describe("ResendTransport", () => {
  it("posts to the emails endpoint with a bearer key", async () => {
    const { fetch, calls } = fakeFetch(200, { id: "re_1" });
    const r = await new ResendTransport({ apiKey: "RKEY", fetch }).send({ ...message, html: "<p>Hi</p>", replyTo: { email: "admin@example.org" }, tags: ["a", "b"] });
    expect(r).toEqual({ ok: true, provider: "resend", messageId: "re_1" });
    const call = calls[0]!;
    expect(call.url).toBe("https://api.resend.com/emails");
    expect(call.headers.authorization).toBe("Bearer RKEY");
    expect(call.body).toMatchObject({
      from: "Qohesion <noreply@mail.qohesion.app>", to: ["member@example.org"], reply_to: "admin@example.org",
      text: message.text, html: "<p>Hi</p>", tags: [{ name: "tag1", value: "a" }, { name: "tag2", value: "b" }],
    });
  });
  it.each([[422, "invalid_message"], [401, "account"], [429, "temporary"], [500, "temporary"]] as const)("classifies HTTP %i as %s", async (status, kind) => {
    const { fetch } = fakeFetch(status, {});
    expect(await new ResendTransport({ apiKey: "K", fetch }).send(message)).toMatchObject({ ok: false, kind, status });
  });
});
