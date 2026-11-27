import { describe, expect, it } from "vitest";
import { handle } from "./hooks.server";

interface Run {
  readonly html: string;
  readonly headers: Record<string, string>;
  readonly cookiesSet: { name: string; value: string; options: Record<string, unknown> }[];
  readonly locals: { locale?: string; theme?: string };
}

async function run(url: string, init: { cookie?: string; acceptLanguage?: string } = {}): Promise<Run> {
  const cookiesSet: Run["cookiesSet"] = [];
  const headers: Record<string, string> = {};
  const locals: Run["locals"] = {};
  const event = {
    url: new URL(url),
    request: new Request(url, { headers: init.acceptLanguage ? { "accept-language": init.acceptLanguage } : {} }),
    cookies: {
      get: (name: string) => (name === "lang" ? init.cookie : undefined),
      set: (name: string, value: string, options: Record<string, unknown>) => void cookiesSet.push({ name, value, options }),
    },
    setHeaders: (h: Record<string, string>) => void Object.assign(headers, h),
    locals,
  };
  let html = "";
  const resolve = async (_event: unknown, options: { transformPageChunk?: (input: { html: string; done: boolean }) => string }) => {
    html = options.transformPageChunk?.({ html: '<html lang="%lang%" data-theme="%theme%">', done: true }) ?? "";
    return new Response("ok");
  };
  await (handle as unknown as (input: { event: unknown; resolve: unknown }) => Promise<Response>)({ event, resolve });
  return { html, headers, cookiesSet, locals };
}

describe("handle", () => {
  it("sets the language of the document and the template from the request", async () => {
    const r = await run("http://localhost/", { acceptLanguage: "en-CA,en;q=0.9" });
    expect(r.html).toBe('<html lang="en" data-theme="standard">');
    expect(r.locals).toEqual({ locale: "en", theme: "standard", session: null });
  });

  it("uses French without a browser setting", async () => {
    expect((await run("http://localhost/")).locals.locale).toBe("fr");
  });

  it("remembers an explicit language choice in a plain functional cookie", async () => {
    const r = await run("http://localhost/?lang=en", { acceptLanguage: "fr" });
    expect(r.locals.locale).toBe("en");
    expect(r.cookiesSet).toHaveLength(1);
    expect(r.cookiesSet[0]).toMatchObject({ name: "lang", value: "en", options: { path: "/", sameSite: "lax", httpOnly: true } });
    expect(r.cookiesSet[0]?.options["maxAge"]).toBe(31_536_000);
  });

  it("does not set the cookie again when it already holds the chosen language, or when the choice is invalid", async () => {
    expect((await run("http://localhost/?lang=en", { cookie: "en" })).cookiesSet).toEqual([]);
    expect((await run("http://localhost/?lang=de")).cookiesSet).toEqual([]);
    expect((await run("http://localhost/")).cookiesSet).toEqual([]);
  });

  it("follows the cookie over the browser setting", async () => {
    expect((await run("http://localhost/", { cookie: "en", acceptLanguage: "fr" })).locals.locale).toBe("en");
  });

  it("accepts a known template and ignores anything else", async () => {
    expect((await run("http://localhost/?theme=ballot-paper")).html).toContain('data-theme="ballot-paper"');
    expect((await run('http://localhost/?theme="><script>')).html).toContain('data-theme="standard"');
  });

  it("tells caches that the page depends on language and cookie, and adds protective headers", async () => {
    const { headers } = await run("http://localhost/");
    expect(headers["vary"]).toBe("Accept-Language, Cookie");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("same-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });
});
