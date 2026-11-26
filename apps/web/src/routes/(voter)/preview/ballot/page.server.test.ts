import { describe, expect, it } from "vitest";
import { actions } from "./+page.server";

type Outcome = { status?: number; data?: { ok: boolean; errors: Record<string, { code: string }[]> }; ok?: boolean; errors?: Record<string, { code: string }[]> };

async function submit(entries: [string, string | Blob][]): Promise<Outcome> {
  const body = new FormData();
  for (const [k, v] of entries) body.append(k, v);
  const request = new Request("http://localhost/preview/ballot", { method: "POST", body });
  // The action only reads the request.
  const run = actions.default as unknown as (event: { request: Request }) => Promise<Outcome>;
  return run({ request });
}

const code = (o: Outcome) => (o.data ?? o).errors?.["choice"]?.[0]?.code;

describe("preview ballot action", () => {
  it("accepts a valid option", async () => {
    const o = await submit([["choice", "for"]]);
    expect(o).toMatchObject({ ok: true });
    expect(code(o)).toBeUndefined();
  });

  it("refuses a missing or empty answer with status 400", async () => {
    for (const entries of [[], [["choice", ""]]] as [string, string][][]) {
      const o = await submit(entries);
      expect(o.status).toBe(400);
      expect(code(o)).toBe("required");
    }
  });

  it("refuses an option that does not exist", async () => {
    const o = await submit([["choice", "hack"]]);
    expect(o.status).toBe(400);
    expect(code(o)).toBe("unknown_option");
  });

  it("refuses several values for a single-choice question", async () => {
    const o = await submit([["choice", "for"], ["choice", "against"]]);
    expect(o.status).toBe(400);
    expect(code(o)).toBe("invalid_type");
  });

  it("refuses a file in place of the answer", async () => {
    const o = await submit([["choice", new Blob(["x"])]]);
    expect(o.status).toBe(400);
  });

  it("refuses a body that is not a valid form with status 400 instead of failing", async () => {
    const run = actions.default as unknown as (event: { request: Request }) => Promise<Outcome>;
    for (const init of [
      { body: "x", headers: { "content-type": "multipart/form-data; boundary=zzz" } },
      { body: "{}", headers: { "content-type": "application/json" } },
      { body: "not a form", headers: { "content-type": "text/plain" } },
    ]) {
      const o = await run({ request: new Request("http://localhost/preview/ballot", { method: "POST", ...init }) });
      expect(o.status).toBe(400);
      expect(code(o)).toBe("invalid_type");
    }
  });

  it("ignores fields it does not know", async () => {
    expect(await submit([["choice", "abstain"], ["other", "x"]])).toMatchObject({ ok: true });
  });
});
