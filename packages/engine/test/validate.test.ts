import { describe, expect, it } from "vitest";
import { validateAnswer, type Question } from "../src/index.js";

const options = [
  { id: "for", label: { fr: "Pour", en: "In favour" } },
  { id: "against", label: { fr: "Contre", en: "Against" } },
  { id: "abstain", label: { fr: "Abstention", en: "Abstention" } },
];
const label = { fr: "Q", en: "Q" };
const codes = (q: Question, v: Parameters<typeof validateAnswer>[1]) => validateAnswer(q, v).map((e) => e.code);

describe("single choice", () => {
  const q: Question = { id: "q", type: "single", label, options, required: true };
  it("accepts a listed option", () => expect(codes(q, "for")).toEqual([]));
  it("rejects an unlisted option", () => expect(codes(q, "maybe")).toEqual(["unknown_option"]));
  it("requires an answer when required", () => expect(codes(q, undefined)).toEqual(["required"]));
  it("rejects a wrong type", () => expect(codes(q, 3)).toEqual(["invalid_type"]));
  it("allows no answer when optional", () => expect(codes({ ...q, required: false }, undefined)).toEqual([]));
});

describe("multiple choice", () => {
  const q: Question = { id: "q", type: "multiple", label, options, min: 1, max: 2, required: true };
  it("accepts a valid selection", () => expect(codes(q, ["for", "abstain"])).toEqual([]));
  it("rejects too many", () => expect(codes(q, ["for", "against", "abstain"])).toEqual(["too_many"]));
  it("rejects duplicates and unknown options", () => {
    expect(codes(q, ["for", "for"])).toEqual(["duplicate_option"]);
    expect(codes(q, ["nope"])).toEqual(["unknown_option"]);
  });
  it("enforces a minimum for an optional question that has an answer", () => {
    const optional: Question = { ...q, required: false, min: 2 };
    expect(codes(optional, ["for"])).toEqual(["too_few"]);
  });
});

describe("text and number", () => {
  it("limits text length", () => {
    const q: Question = { id: "t", type: "text", label, maxLength: 5 };
    expect(codes(q, "abcdef")).toEqual(["too_long"]);
    expect(codes(q, "abc")).toEqual([]);
  });
  it("checks number type, integer and range", () => {
    const q: Question = { id: "n", type: "number", label, integer: true, min: 1, max: 100 };
    expect(codes(q, "12")).toEqual(["not_a_number"]);
    expect(codes(q, 1.5)).toEqual(["not_an_integer"]);
    expect(codes(q, 0)).toEqual(["below_min"]);
    expect(codes(q, 101)).toEqual(["above_max"]);
    expect(codes(q, Number.NaN)).toEqual(["not_a_number"]);
    expect(codes(q, 50)).toEqual([]);
  });
});

describe("colour and toggle", () => {
  const q: Question = { id: "c", type: "color", label, contrast: [{ against: "#FFFFFF", minRatio: 4.5 }] };
  it("accepts a colour with enough contrast", () => expect(codes(q, "#1F5C46")).toEqual([]));
  it("rejects a colour with too little contrast and reports the ratio", () => {
    const e = validateAnswer(q, "#FFE066");
    expect(e[0]?.code).toBe("low_contrast");
    expect(e[0]?.params?.min).toBe(4.5);
  });
  it("rejects a malformed colour", () => expect(codes(q, "green")).toEqual(["invalid_color"]));
  it("treats false as an answer for a required toggle", () => {
    const t: Question = { id: "t", type: "toggle", label, required: true };
    expect(codes(t, false)).toEqual([]);
    expect(codes(t, "yes")).toEqual(["invalid_type"]);
  });
});
