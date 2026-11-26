import { describe, expect, it } from "vitest";
import { missingTranslations, validateForm } from "@qohesion/engine";
import { previewBallot } from "./ballot";

describe("preview ballot", () => {
  it("is fully translated into French and English", () => {
    expect(missingTranslations(previewBallot, ["fr", "en"])).toEqual([]);
  });

  it("accepts each of the three options and nothing else", () => {
    for (const choice of ["for", "against", "abstain"]) expect(validateForm(previewBallot, { choice }).ok).toBe(true);
    expect(validateForm(previewBallot, { choice: "maybe" }).errors["choice"]?.[0]?.code).toBe("unknown_option");
    expect(validateForm(previewBallot, {}).errors["choice"]?.[0]?.code).toBe("required");
  });
});
