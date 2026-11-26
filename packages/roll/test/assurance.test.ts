import { describe, expect, it } from "vitest";
import { assuranceLevel, checkAdminSetup, recommendedThreshold, type AssuranceInput } from "../src/index.js";

describe("checkAdminSetup", () => {
  it.each([
    [3, 2], [5, 3], [4, 2], [7, 4],
  ])("accepts %i administrators with %i needed, with no warning", (n, k) => {
    expect(checkAdminSetup(n, k)).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it.each([
    [1, 1, "single_administrator"],
    [2, 1, "either_can_open_alone"],
    [2, 2, "both_required_no_redundancy"],
    [4, 1, "any_single_can_open"],
    [3, 3, "no_redundancy"],
    [5, 5, "no_redundancy"],
  ] as const)("accepts %i administrators with %i needed, and warns %s", (n, k, warning) => {
    expect(checkAdminSetup(n, k)).toEqual({ valid: true, errors: [], warnings: [warning] });
  });

  it("rejects impossible setups", () => {
    expect(checkAdminSetup(0, 1).errors).toEqual(["no_administrator", "threshold_above_administrators"]);
    expect(checkAdminSetup(3, 0).errors).toEqual(["threshold_below_one"]);
    expect(checkAdminSetup(3, 4).errors).toEqual(["threshold_above_administrators"]);
    expect(checkAdminSetup(2.5, 1).errors).toEqual(["not_an_integer"]);
    expect(checkAdminSetup(3, Number.NaN).errors).toEqual(["not_an_integer"]);
    expect(checkAdminSetup(3, 4).valid).toBe(false);
  });

  it("gives no warnings for an invalid setup", () => {
    expect(checkAdminSetup(0, 0).warnings).toEqual([]);
  });
});

describe("recommendedThreshold", () => {
  it.each([[1, 1], [3, 2], [4, 3], [5, 3], [6, 4], [7, 4], [9, 5]])("recommends, for %i administrators, %i", (n, k) => {
    expect(recommendedThreshold(n)).toBe(k);
  });

  it("recommends nothing for two administrators, where both options are weak, or for invalid counts", () => {
    expect(recommendedThreshold(2)).toBeNull();
    expect(recommendedThreshold(0)).toBeNull();
    expect(recommendedThreshold(-1)).toBeNull();
    expect(recommendedThreshold(2.5)).toBeNull();
  });

  it("never recommends a setup that carries a warning, except for a single administrator", () => {
    for (let n = 3; n <= 15; n++) {
      const k = recommendedThreshold(n);
      expect(k).not.toBeNull();
      expect(checkAdminSetup(n, k ?? 0).warnings).toEqual([]);
    }
  });
});

const base: AssuranceInput = { administrators: 1, threshold: 1, registration: false, rollCoSigned: false, anchored: false };

describe("assuranceLevel", () => {
  it("is informal for a single administrator with no registration, and lists what formal needs", () => {
    const a = assuranceLevel(base);
    expect(a.level).toBe("informal");
    expect(a.setup.warnings).toEqual(["single_administrator"]);
    expect(a.missingForNext).toEqual(["three_administrators", "threshold_two", "registration", "roll_co_signed"]);
  });

  it("is formal with 2 of 3 administrators, registration and a co-signed roll", () => {
    const a = assuranceLevel({ ...base, administrators: 3, threshold: 2, registration: true, rollCoSigned: true });
    expect(a.level).toBe("formal");
    expect(a.missingForNext).toEqual(["five_administrators", "threshold_three", "anchored"]);
  });

  it("is reinforced with 3 of 5, registration, a co-signed roll and outside timestamps", () => {
    const a = assuranceLevel({ administrators: 5, threshold: 3, registration: true, rollCoSigned: true, anchored: true });
    expect(a.level).toBe("reinforced");
    expect(a.missingForNext).toEqual([]);
  });

  it("stays formal with 3 of 5 until the checkpoints are timestamped", () => {
    const a = assuranceLevel({ administrators: 5, threshold: 3, registration: true, rollCoSigned: true, anchored: false });
    expect(a.level).toBe("formal");
    expect(a.missingForNext).toEqual(["anchored"]);
  });

  it("does not count a threshold that needs every administrator", () => {
    const a = assuranceLevel({ administrators: 3, threshold: 3, registration: true, rollCoSigned: true, anchored: false });
    expect(a.level).toBe("informal");
    expect(a.missingForNext).toEqual(["threshold_below_all"]);
  });

  it("does not reach formal with two administrators, whatever the threshold", () => {
    for (const threshold of [1, 2]) {
      const a = assuranceLevel({ administrators: 2, threshold, registration: true, rollCoSigned: true, anchored: true });
      expect(a.level).toBe("informal");
      expect(a.missingForNext).toContain("three_administrators");
    }
  });

  it("needs registration and a co-signed roll for formal", () => {
    const three = { ...base, administrators: 3, threshold: 2 };
    expect(assuranceLevel({ ...three, rollCoSigned: true }).missingForNext).toEqual(["registration"]);
    expect(assuranceLevel({ ...three, registration: true }).missingForNext).toEqual(["roll_co_signed"]);
  });

  it("is informal for an invalid setup, and reports it", () => {
    const a = assuranceLevel({ administrators: 3, threshold: 5, registration: true, rollCoSigned: true, anchored: true });
    expect(a.level).toBe("informal");
    expect(a.setup.valid).toBe(false);
    expect(a.setup.errors).toEqual(["threshold_above_administrators"]);
  });

  it("is never reinforced without outside timestamps, 5 administrators and a threshold of 3", () => {
    for (let n = 1; n <= 7; n++) for (let k = 1; k <= n; k++) for (const anchored of [false, true]) {
      const a = assuranceLevel({ administrators: n, threshold: k, registration: true, rollCoSigned: true, anchored });
      if (a.level === "reinforced") {
        expect(n).toBeGreaterThanOrEqual(5);
        expect(k).toBeGreaterThanOrEqual(3);
        expect(k).toBeLessThan(n);
        expect(anchored).toBe(true);
      }
    }
  });
});
