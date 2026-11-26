import { describe, expect, it } from "vitest";
import { assessUpdate, channelOf, compareVersions, displayVersion, formatVersion, parseVersion, versionInfo } from "../src/index.js";

describe("parseVersion", () => {
  it("reads plain and prefixed versions", () => {
    expect(parseVersion("0.1.0")).toEqual({ major: 0, minor: 1, patch: 0, prerelease: [] });
    expect(parseVersion("v0.2.3-alpha.1")).toEqual({ major: 0, minor: 2, patch: 3, prerelease: ["alpha", "1"] });
  });
  it("ignores build metadata", () => expect(formatVersion(parseVersion("1.0.0+abc123")!)).toBe("1.0.0"));
  it("rejects invalid versions", () => {
    for (const bad of ["", "1", "1.2", "01.2.3", "1.2.3.4", "a.b.c", "1.2.3-"]) expect(parseVersion(bad)).toBeNull();
  });
});

describe("compareVersions follows the SemVer 2.0.0 precedence examples", () => {
  const ordered = ["1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-alpha.beta", "1.0.0-beta", "1.0.0-beta.2", "1.0.0-beta.11", "1.0.0-rc.1", "1.0.0", "1.0.1", "1.1.0", "2.0.0"];
  it("orders the reference list", () => {
    for (let i = 0; i < ordered.length - 1; i++) expect(compareVersions(ordered[i]!, ordered[i + 1]!)).toBe(-1);
  });
  it("is symmetric and equal for the same version", () => {
    expect(compareVersions("0.1.0", "v0.1.0")).toBe(0);
    expect(compareVersions("0.2.0", "0.1.9")).toBe(1);
  });
  it("throws on an invalid version", () => expect(() => compareVersions("x", "0.1.0")).toThrow());
});

describe("channel and display", () => {
  it("treats major 0 as alpha", () => {
    expect(channelOf("0.1.0")).toBe("alpha");
    expect(displayVersion("0.1.0")).toBe("v0.1.0 (alpha)");
  });
  it("recognises beta and stable", () => {
    expect(channelOf("1.0.0-beta.1")).toBe("beta");
    expect(channelOf("1.2.0")).toBe("stable");
    expect(displayVersion("1.2.0")).toBe("v1.2.0");
  });
  it("builds the version info with optional build data", () => {
    expect(versionInfo("0.1.0")).toEqual({ version: "0.1.0", channel: "alpha", display: "v0.1.0 (alpha)" });
    expect(versionInfo("v0.1.0", { commit: "abc1234", builtAt: "2026-11-25T12:00:00Z" })).toMatchObject({ commit: "abc1234", builtAt: "2026-11-25T12:00:00Z" });
  });
});

describe("assessUpdate", () => {
  it("requires a backup and warns about compatibility for an alpha upgrade", () => {
    const a = assessUpdate("0.1.0", "0.2.0");
    expect(a).toMatchObject({ direction: "upgrade", allowed: true, minorsSkipped: 0 });
    expect(a.notes).toEqual(["backup_required", "may_break_compatibility"]);
  });
  it("counts skipped minor versions", () => {
    const a = assessUpdate("0.1.0", "0.4.2");
    expect(a.minorsSkipped).toBe(2);
    expect(a.notes).toContain("skips_minor_versions");
  });
  it("allows a patch update within a stable line without a compatibility warning", () => {
    const a = assessUpdate("1.2.0", "1.2.3");
    expect(a.notes).toEqual(["backup_required"]);
  });
  it("flags a major upgrade and a prerelease target", () => {
    const a = assessUpdate("1.4.0", "2.0.0-beta.1");
    expect(a.notes).toEqual(["backup_required", "may_break_compatibility", "prerelease_target"]);
  });
  it("does not allow downgrades", () => {
    const a = assessUpdate("0.3.0", "0.2.0");
    expect(a).toMatchObject({ direction: "downgrade", allowed: false });
    expect(a.notes).toEqual(["downgrade_unsupported"]);
  });
  it("accepts the same version", () => expect(assessUpdate("0.1.0", "v0.1.0")).toMatchObject({ direction: "same", allowed: true, notes: [] }));
});
