import { describe, expect, it } from "vitest";
import {
  defineForm, FormDefinitionError, missingTranslations, nextStepId, previousStepId, progress,
  validateForm, visibleSteps, type Form,
} from "../src/index.js";

/** A real ballot: one question, three fixed options. */
const ballot: Form = defineForm({
  id: "budget-2027",
  title: { fr: "Adoption du budget 2027", en: "Adoption of the 2027 budget" },
  steps: [{
    id: "q1",
    title: { fr: "Question 1", en: "Question 1" },
    questions: [{
      id: "choice", type: "single", required: true,
      label: { fr: "Choix", en: "Choice" },
      options: [
        { id: "for", label: { fr: "Pour", en: "In favour" } },
        { id: "against", label: { fr: "Contre", en: "Against" } },
        { id: "abstain", label: { fr: "Abstention", en: "Abstention" } },
      ],
    }],
  }],
});

/** A settings form: the same engine configures the organization. */
const setup: Form = defineForm({
  id: "setup",
  title: { fr: "Configuration", en: "Setup" },
  steps: [
    { id: "look", title: { fr: "Apparence", en: "Appearance" }, questions: [
      { id: "template", type: "single", required: true, label: { fr: "Modèle", en: "Template" },
        options: [{ id: "seed-packet", label: { fr: "Seed Packet", en: "Seed Packet" } }, { id: "ballot-paper", label: { fr: "Ballot Paper", en: "Ballot Paper" } }] },
      { id: "brand", type: "color", required: true, label: { fr: "Couleur principale", en: "Brand colour" }, contrast: [{ against: "#FFFFFF", minRatio: 4.5 }] },
    ] },
    { id: "rules", title: { fr: "Règles", en: "Rules" }, questions: [
      { id: "secret", type: "toggle", label: { fr: "Scrutin secret", en: "Secret ballot" } },
      { id: "quorum", type: "number", integer: true, min: 1, max: 100, label: { fr: "Quorum (%)", en: "Quorum (%)" } },
    ] },
    { id: "proxy", title: { fr: "Procurations", en: "Proxies" }, questions: [
      { id: "proxy-limit", type: "number", integer: true, min: 1, label: { fr: "Procurations par personne", en: "Proxies per person" }, showIf: { question: "secret", equals: false } },
    ] },
  ],
});

describe("ballot", () => {
  it("is valid with one choice", () => expect(validateForm(ballot, { choice: "for" }).ok).toBe(true));
  it("is invalid without a choice", () => {
    const r = validateForm(ballot, {});
    expect(r.ok).toBe(false);
    expect(r.errors.choice?.[0]?.code).toBe("required");
  });
  it("reports progress", () => {
    expect(progress(ballot, {})).toEqual({ answered: 0, total: 1 });
    expect(progress(ballot, { choice: "for" })).toEqual({ answered: 1, total: 1 });
  });
});

describe("conditional steps", () => {
  it("hides a step whose questions are all hidden", () => {
    expect(visibleSteps(setup, { secret: true }).map((s) => s.id)).toEqual(["look", "rules"]);
    expect(visibleSteps(setup, { secret: false }).map((s) => s.id)).toEqual(["look", "rules", "proxy"]);
  });
  it("moves between visible steps", () => {
    const a = { secret: true };
    expect(nextStepId(setup, "look", a)).toBe("rules");
    expect(nextStepId(setup, "rules", a)).toBeUndefined();
    expect(previousStepId(setup, "rules", a)).toBe("look");
    expect(previousStepId(setup, "look", a)).toBeUndefined();
  });
  it("ignores answers to hidden questions", () => {
    const r = validateForm(setup, { template: "seed-packet", brand: "#1F5C46", secret: true, "proxy-limit": -5 });
    expect(r.ok).toBe(true);
  });
  it("validates a question once it becomes visible", () => {
    const r = validateForm(setup, { template: "seed-packet", brand: "#1F5C46", secret: false, "proxy-limit": 0 });
    expect(r.errors["proxy-limit"]?.[0]?.code).toBe("below_min");
  });
  it("flags a colour that fails the contrast rule", () => {
    const r = validateForm(setup, { template: "seed-packet", brand: "#FFE066" });
    expect(r.errors.brand?.[0]?.code).toBe("low_contrast");
  });
});

describe("defineForm", () => {
  const label = { fr: "x", en: "x" };
  it("lists every structural problem", () => {
    try {
      defineForm({
        id: "bad", title: label,
        steps: [
          { id: "s", title: label, questions: [
            { id: "a", type: "single", label, options: [{ id: "o", label }, { id: "o", label }] },
            { id: "a", type: "multiple", label, options: [{ id: "x", label }], min: 3, max: 2 },
            { id: "b", type: "toggle", label, showIf: { question: "later", equals: true } },
          ] },
          { id: "s", title: { fr: "" }, questions: [] },
        ],
      });
      throw new Error("expected failure");
    } catch (e) {
      expect(e).toBeInstanceOf(FormDefinitionError);
      const p = (e as FormDefinitionError).problems.join("\n");
      expect(p).toContain('duplicate option id "o"');
      expect(p).toContain('question "a": duplicate id');
      expect(p).toContain("min is greater than max");
      expect(p).toContain("which is not an earlier question");
      expect(p).toContain('step "s": duplicate id');
      expect(p).toContain("no questions");
    }
  });
  it("rejects a forward reference", () => {
    expect(() => defineForm({ id: "f", title: label, steps: [{ id: "s", title: label, questions: [
      { id: "a", type: "toggle", label, showIf: { question: "b", equals: true } },
      { id: "b", type: "toggle", label },
    ] }] })).toThrow(FormDefinitionError);
  });
});

describe("missingTranslations", () => {
  it("is empty when every text exists in every language", () => {
    expect(missingTranslations(ballot, ["fr", "en"])).toEqual([]);
  });
  it("lists the texts missing from a language", () => {
    const m = missingTranslations(ballot, ["fr", "en", "es"]);
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((x) => x.missing.includes("es") && x.missing.length === 1)).toBe(true);
    expect(m.map((x) => x.path)).toContain("choice.for.label");
  });
});
