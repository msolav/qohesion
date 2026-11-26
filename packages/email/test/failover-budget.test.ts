import { describe, expect, it } from "vitest";
import { BudgetedTransport, DailyBudget, FailoverTransport } from "../src/index.js";
import { fail, message, ok, stubTransport } from "./helpers.js";

const service = { ...message, lane: "service" as const };
const voting = { ...message, lane: "voting" as const };

describe("FailoverTransport", () => {
  it("uses the primary when it works", async () => {
    const a = stubTransport("brevo", ok("brevo")), b = stubTransport("resend", ok("resend"));
    expect(await new FailoverTransport(a, b).send(service)).toMatchObject({ ok: true, provider: "brevo" });
    expect(b.sent).toHaveLength(0);
  });
  it.each(["account", "temporary", "budget"] as const)("fails over service email on a %s failure", async (kind) => {
    const a = stubTransport("brevo", fail("brevo", kind)), b = stubTransport("resend", ok("resend"));
    expect(await new FailoverTransport(a, b).send(service)).toMatchObject({ ok: true, provider: "resend" });
  });
  it("does not fail over a wrong message", async () => {
    const a = stubTransport("brevo", fail("brevo", "invalid_message")), b = stubTransport("resend", ok("resend"));
    expect(await new FailoverTransport(a, b).send(service)).toMatchObject({ ok: false, kind: "invalid_message" });
    expect(b.sent).toHaveLength(0);
  });
  it("does not fail over the voting lane by default", async () => {
    const a = stubTransport("brevo", fail("brevo", "account")), b = stubTransport("resend", ok("resend"));
    expect(await new FailoverTransport(a, b).send(voting)).toMatchObject({ ok: false, kind: "account" });
    expect(b.sent).toHaveLength(0);
  });
  it("can allow the voting lane on request", async () => {
    const a = stubTransport("brevo", fail("brevo", "temporary")), b = stubTransport("resend", ok("resend"));
    expect(await new FailoverTransport(a, b, { failoverLanes: ["service", "voting"] }).send(voting)).toMatchObject({ ok: true, provider: "resend" });
  });
});

describe("DailyBudget", () => {
  const at = (iso: string) => () => new Date(iso);
  it("reserves part of the budget for service emails", () => {
    const b = new DailyBudget(10, 3, at("2026-11-26T12:00:00Z"));
    for (let i = 0; i < 7; i++) expect(b.tryConsume("voting")).toBe(true);
    expect(b.tryConsume("voting")).toBe(false); // 7 = 10 minus the 3 reserved
    for (let i = 0; i < 3; i++) expect(b.tryConsume("service")).toBe(true);
    expect(b.tryConsume("service")).toBe(false); // 10 used in total
  });
  it("never lets the lanes together pass the daily limit", () => {
    const b = new DailyBudget(10, 3, at("2026-11-26T12:00:00Z"));
    for (let i = 0; i < 8; i++) b.tryConsume("service");
    expect(b.tryConsume("voting")).toBe(true);
    expect(b.tryConsume("voting")).toBe(true);
    expect(b.tryConsume("voting")).toBe(false);
  });
  it("starts again each UTC day", () => {
    let now = new Date("2026-11-26T23:59:00Z");
    const b = new DailyBudget(2, 0, () => now);
    expect(b.tryConsume("voting")).toBe(true);
    expect(b.tryConsume("voting")).toBe(true);
    expect(b.tryConsume("voting")).toBe(false);
    now = new Date("2026-11-27T00:01:00Z");
    expect(b.tryConsume("voting")).toBe(true);
  });
  it("reports what remains", () => {
    const b = new DailyBudget(300, 50, at("2026-11-26T12:00:00Z"));
    b.tryConsume("voting"); b.tryConsume("service");
    expect(b.remaining()).toEqual({ total: 298, voting: 249 });
  });
  it("rejects an impossible reserve", () => expect(() => new DailyBudget(10, 11)).toThrow());
});

describe("BudgetedTransport", () => {
  it("refuses a message when the budget is used up, without calling the provider", async () => {
    const inner = stubTransport("brevo", ok("brevo"));
    const t = new BudgetedTransport(inner, new DailyBudget(1, 0, () => new Date("2026-11-26T12:00:00Z")));
    expect(await t.send(voting)).toMatchObject({ ok: true });
    expect(await t.send(voting)).toMatchObject({ ok: false, kind: "budget" });
    expect(inner.sent).toHaveLength(1);
  });
  it("gives the unit back when sending fails", async () => {
    const inner = stubTransport("brevo", fail("brevo", "temporary"));
    const budget = new DailyBudget(1, 0, () => new Date("2026-11-26T12:00:00Z"));
    const t = new BudgetedTransport(inner, budget);
    await t.send(voting);
    expect(budget.remaining().total).toBe(1);
  });
  it("lets service email fail over to the standby once the primary budget is used", async () => {
    const budget = new DailyBudget(1, 0, () => new Date("2026-11-26T12:00:00Z"));
    const primary = new BudgetedTransport(stubTransport("brevo", ok("brevo")), budget);
    const standby = stubTransport("resend", ok("resend"));
    const t = new FailoverTransport(primary, standby);
    expect(await t.send(service)).toMatchObject({ provider: "brevo" });
    expect(await t.send(service)).toMatchObject({ ok: true, provider: "resend" });
  });
});
