// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { guideMessages, TOPIC_IDS } from "./i18n/guide.js";
import { METHODS, METHOD_IDS } from "./methods.js";
import { learnHref, propertiesOf, typeOfOptions, type PropertyInput } from "./properties.js";

const base: PropertyInput = {
  questionTypes: ["yes-no"],
  anonymity: "secret",
  encrypted: true,
  timing: "close",
  audience: "voters",
  allowChange: false,
  lateRoll: false,
  publishCount: false,
  lockCancel: false,
  emailReceipt: false,
  showVoted: true,
  disclosure: null,
  rules: { afterVotes: null, turnoutPercent: null, threshold: null },
  closes: "Dec. 1, 12:00",
};

describe("propertiesOf", () => {
  it("gives every property an icon, a label, a badge and a description, in both languages", () => {
    for (const locale of ["fr", "en"] as const) {
      const rows = propertiesOf(locale, { ...base, anonymity: "named", disclosure: { name: "masked", email: "masked" }, publishCount: true, lockCancel: true, allowChange: true, approval: { badge: "Approved", lines: ["Approved"] } });
      expect(rows.map((r) => r.id)).toEqual(["method", "closing", "roll", "ballot", "list", "seal", "change", "receipt", "results", "publication", "cancel", "approval"]);
      for (const r of rows) {
        expect(r.icon, r.id).not.toBe("");
        expect(r.label, r.id).not.toBe("");
        expect(r.badges.length, r.id).toBeGreaterThan(0);
        expect(r.text.length, r.id).toBeGreaterThan(0);
      }
    }
  });
  it("says whether the receipt can be emailed, and warns where that ties an address to a published ballot", () => {
    const off = propertiesOf("en", base).find((r) => r.id === "receipt");
    expect(off?.badges).toEqual(["Copy or file only"]);
    expect(off?.tone).toBe("neutral");
    const on = propertiesOf("en", { ...base, emailReceipt: true }).find((r) => r.id === "receipt");
    expect(on?.tone).toBe("open");
    expect(on?.text.join(" ")).not.toContain("ties the address");
    const ties = propertiesOf("fr", { ...base, emailReceipt: true, publishCount: true }).find((r) => r.id === "receipt");
    expect(ties?.text.join(" ")).toContain("associe l’adresse au code");
    expect(propertiesOf("en", { ...base, emailReceipt: true, anonymity: "named", publishCount: true, disclosure: { name: "full", email: "full" } }).find((r) => r.id === "receipt")?.text.join(" ")).not.toContain("ties the address");
  });
  it("opens no description with a pronoun that points back to the badge, in any setting", () => {
    const pronoun = /^(It|They|This|These|Il|Elle|Ils|Elles|Ce|Cela|Ceci)\b/;
    for (const locale of ["fr", "en"] as const) {
      for (const anonymity of ["secret", "named"] as const) {
        for (const flag of [true, false]) {
          const rows = propertiesOf(locale, { ...base, anonymity, encrypted: flag, allowChange: flag, lateRoll: flag, publishCount: flag, lockCancel: flag, emailReceipt: flag, disclosure: { name: "masked", email: "masked" }, closes: flag ? "Dec. 1" : null, roll: { count: 3, code: "ABCD-1234" } });
          for (const row of rows) for (const line of row.text) expect(pronoun.test(line), `${locale} ${row.id}: ${line}`).toBe(false);
        }
      }
    }
  });
  it("tells the three states of who can tell who voted what apart, with their own icons", () => {
    const row = (over: Partial<PropertyInput>) => propertiesOf("en", { ...base, ...over }).find((r) => r.id === "ballot");
    expect(row({ showVoted: false })).toMatchObject({ icon: "mask", badges: ["Anonymous"] });
    expect(row({ showVoted: true })).toMatchObject({ icon: "ballot", badges: ["Identity known, answers secret"] });
    expect(row({ anonymity: "named", disclosure: { name: "full", email: "full" } })).toMatchObject({ icon: "users" });
    expect(row({ showVoted: false })?.text.join(" ")).toContain("does not show who has voted");
    expect(propertiesOf("en", { ...base, encrypted: false }).find((r) => r.id === "seal")?.icon).toBe("unlock");
    expect(propertiesOf("en", base).find((r) => r.id === "seal")?.icon).toBe("lock");
  });
  it("marks a secret, encrypted poll as private and a named, plain one as open", () => {
    const secret = propertiesOf("en", base);
    expect(secret.find((r) => r.id === "ballot")?.tone).toBe("private");
    expect(secret.find((r) => r.id === "seal")?.tone).toBe("private");
    const named = propertiesOf("en", { ...base, anonymity: "named", encrypted: false, disclosure: { name: "full", email: "full" } });
    expect(named.find((r) => r.id === "ballot")?.tone).toBe("open");
    expect(named.find((r) => r.id === "seal")?.tone).toBe("open");
  });
  it("lists the signatories only for a named poll, and says so when nobody is shown", () => {
    expect(propertiesOf("en", base).some((r) => r.id === "list")).toBe(false);
    const nobody = propertiesOf("en", { ...base, anonymity: "named", disclosure: { name: "none", email: "none" } }).find((r) => r.id === "list");
    expect(nobody?.badges).toEqual(["Not shown"]);
    expect(nobody?.text[0]).toMatch(/only the totals/i);
    const masked = propertiesOf("en", { ...base, anonymity: "named", disclosure: { name: "masked", email: "masked" } }).find((r) => r.id === "list");
    expect(masked?.badges).toEqual(["Marie T*** <m***y@e***e.org>"]);
  });
  it("describes a poll of several questions by their number", () => {
    const rows = propertiesOf("en", { ...base, questionTypes: ["yes-no", "single", "single"] });
    expect(rows[0]?.badges).toEqual(["3 questions"]);
  });
  it("links each property to a page that exists", () => {
    const rows = propertiesOf("en", { ...base, anonymity: "named", disclosure: { name: "full", email: "full" }, publishCount: true, approval: { badge: "x", lines: ["x"] } });
    for (const r of rows) {
      if (!r.learn) continue;
      if (r.learn.page === "how") expect(TOPIC_IDS as readonly string[], r.id).toContain(r.learn.anchor);
      else expect(METHOD_IDS as readonly string[], r.id).toContain(r.learn.anchor);
    }
    expect(learnHref("fr", { page: "how", anchor: "sealed" })).toBe("/how?lang=fr#sealed");
  });
  it("tells a yes-no question from a choice by its options", () => {
    expect(typeOfOptions([{ id: "for" }, { id: "against" }, { id: "abstain" }])).toBe("yes-no");
    expect(typeOfOptions([{ id: "o1" }, { id: "o2" }])).toBe("single");
  });
});

describe("the information texts", () => {
  it("cover every topic and every method, with steps and limits, in both languages", () => {
    for (const locale of ["fr", "en"] as const) {
      const g = guideMessages[locale];
      for (const id of TOPIC_IDS) {
        const t = g.how.topics[id];
        expect([t.title, t.summary].every((x) => x.length > 0), `${locale} ${id}`).toBe(true);
        expect(t.body.length, `${locale} ${id}`).toBeGreaterThan(0);
        expect(t.steps.length, `${locale} ${id}`).toBeGreaterThan(0);
        expect(t.limits.length, `${locale} ${id}`).toBeGreaterThan(0);
      }
      for (const id of METHOD_IDS) {
        const t = g.methods.list[id];
        expect([t.name, t.summary].every((x) => x.length > 0), `${locale} ${id}`).toBe(true);
        expect(t.how.length, `${locale} ${id}`).toBeGreaterThan(0);
        expect(t.limits.length, `${locale} ${id}`).toBeGreaterThan(0);
      }
    }
    expect(METHODS.map((m) => m.id).sort()).toEqual([...METHOD_IDS].sort());
  });
  it("keep to the house rules: no space before a colon, semicolon, question or exclamation mark in French (docs/content-style.md), and no dash used as a pause", () => {
    const texts = (value: unknown): string[] => (typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(texts) : value && typeof value === "object" ? Object.values(value).flatMap(texts) : []);
    for (const t of texts(guideMessages.fr)) {
      expect(t, t).not.toMatch(/ [:;!?]/);
    }
    for (const locale of ["fr", "en"] as const) for (const t of texts(guideMessages[locale])) expect(t, t).not.toMatch(/ — | – /);
  });
});
