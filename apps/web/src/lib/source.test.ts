import { describe, expect, it } from "vitest";
import { UPSTREAM_SOURCE, sourceUrl } from "./source";

describe("sourceUrl", () => {
  it("uses the upstream repository by default", () => {
    expect(sourceUrl(undefined)).toBe(UPSTREAM_SOURCE);
    expect(sourceUrl("")).toBe(UPSTREAM_SOURCE);
    expect(sourceUrl("   ")).toBe(UPSTREAM_SOURCE);
  });

  it("accepts the address of an installation's own copy", () => {
    expect(sourceUrl("https://git.example.org/vote/qohesion")).toBe("https://git.example.org/vote/qohesion");
    expect(sourceUrl(" https://git.example.org/vote/qohesion ")).toBe("https://git.example.org/vote/qohesion");
  });

  it("refuses anything that is not a plain https address", () => {
    for (const bad of ["http://git.example.org/x", "javascript:alert(1)", "data:text/html,x", "git.example.org/x", "https://user:pw@git.example.org/x", "ftp://x.org", "not a url"]) {
      expect(sourceUrl(bad), bad).toBe(UPSTREAM_SOURCE);
    }
  });
});
