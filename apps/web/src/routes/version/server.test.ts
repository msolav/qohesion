import { describe, expect, it } from "vitest";
import { GET } from "./+server";

describe("GET /version", () => {
  it("reports the version from the VERSION file, its channel and its display form, as JSON", async () => {
    const res = await (GET as unknown as () => Response | Promise<Response>)();
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as Record<string, string>;
    expect(body["version"]).toMatch(/^\d+\.\d+\.\d+/);
    expect(body["channel"]).toBe("alpha");
    expect(body["display"]).toBe(`v${body["version"]} (alpha)`);
    expect(Date.parse(body["builtAt"] ?? "")).not.toBeNaN();
  });
});
