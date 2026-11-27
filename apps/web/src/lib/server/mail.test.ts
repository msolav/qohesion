// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { sendInvitations, sendReceipt } from "./mail.js";

const common = {
  locale: "en" as const,
  organization: "Maple Court",
  poll: "Budget 2027",
  closesAt: null,
  timeZone: "America/Toronto",
  ballotStatement: "It is encrypted as soon as it is received.",
  resultsStatement: "Results are shown when the poll closes.",
};

describe("sending invitations", () => {
  it("sends one message per entry, each with that entry's own link and no other address", async () => {
    const seen: { to: string; text: string }[] = [];
    const report = await sendInvitations(
      [{ id: 1, address: "a@example.com", link: "https://vote.example.org/v/AAA" }, { id: 2, address: "b@example.com", link: "https://vote.example.org/v/BBB" }],
      common,
      async (m) => {
        seen.push({ to: m.to.email, text: m.text });
        return { ok: true };
      },
    );
    expect(report).toEqual({ sent: [1, 2], failed: 0, firstProblem: null });
    expect(seen[0]?.text).toContain("/v/AAA");
    expect(seen[0]?.text).not.toContain("/v/BBB");
    expect(seen[0]?.text).not.toContain("b@example.com");
    expect(seen[1]?.to).toBe("b@example.com");
  });

  it("reports the entries that failed and the first reason, and sends on", async () => {
    const report = await sendInvitations(
      [{ id: 1, address: "a@example.com", link: "https://vote.example.org/v/AAA" }, { id: 2, address: "b@example.com", link: "https://vote.example.org/v/BBB" }, { id: 3, address: "c@example.com", link: "https://vote.example.org/v/CCC" }],
      common,
      async (m) => (m.to.email === "b@example.com" ? { ok: false, reason: "daily budget used up" } : { ok: true }),
    );
    expect(report).toEqual({ sent: [1, 3], failed: 1, firstProblem: "daily budget used up" });
  });

  it("sends nothing when email is not configured", async () => {
    const report = await sendInvitations([{ id: 1, address: "a@example.com", link: "https://vote.example.org/v/AAA" }], common);
    expect(report.sent).toEqual([]);
    expect(report.failed).toBe(1);
  });
});

describe("sending a receipt", () => {
  const input = { locale: "en" as const, organization: "Maple Court", poll: "Budget 2027", code: "K7QM-39XD-82HT", checkLink: "https://vote.example.org/r/abc", linksVoterToBallot: false };

  it("sends one message to the one address, with the code and no voting link", async () => {
    const seen: { to: string; text: string; tags: readonly string[] | undefined }[] = [];
    const result = await sendReceipt(input, "a@example.com", async (m) => { seen.push({ to: m.to.email, text: m.text, tags: m.tags }); return { ok: true }; });
    expect(result.ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.to).toBe("a@example.com");
    expect(seen[0]?.text).toContain("K7QM-39XD-82HT");
    expect(seen[0]?.text).not.toContain("/v/");
    expect(seen[0]?.tags).toEqual(["receipt"]);
  });

  it("reports a failure and sends nothing when email is not configured", async () => {
    expect((await sendReceipt(input, "a@example.com")).ok).toBe(false);
    expect((await sendReceipt(input, "a@example.com", async () => ({ ok: false, reason: "daily budget used up" }))).reason).toBe("daily budget used up");
  });
});
