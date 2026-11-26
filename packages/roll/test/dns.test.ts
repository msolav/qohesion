import { describe, expect, it } from "vitest";
import { checkDomainMail, makeMailResolver } from "../src/index.js";

const fail = (code: string) => Object.assign(new Error(code), { code });
const ok = <T>(v: T) => async () => v;
const bad = (code: string) => async () => { throw fail(code); };

const resolverOf = (a: () => Promise<readonly string[]>, aaaa: () => Promise<readonly string[]>) =>
  makeMailResolver(bad("ENODATA"), a, aaaa);

describe("makeMailResolver, address lookups", () => {
  it("combines IPv4 and IPv6 and succeeds if either has records", async () => {
    expect(await resolverOf(ok(["192.0.2.1"]), bad("ENODATA")).resolveAddress("x.org")).toEqual(["192.0.2.1"]);
    expect(await resolverOf(bad("ENODATA"), ok(["2001:db8::1"])).resolveAddress("x.org")).toEqual(["2001:db8::1"]);
    expect(await resolverOf(ok(["192.0.2.1"]), ok(["2001:db8::1"])).resolveAddress("x.org")).toEqual(["192.0.2.1", "2001:db8::1"]);
  });

  it("succeeds when one lookup fails temporarily but the other finds records", async () => {
    expect(await resolverOf(bad("ETIMEOUT"), ok(["2001:db8::1"])).resolveAddress("x.org")).toEqual(["2001:db8::1"]);
  });

  it("reports a temporary failure rather than missing data when the other answer is negative", async () => {
    // An IPv6-only domain whose AAAA lookup timed out must not be reported as having no mail host.
    for (const code of ["ETIMEOUT", "ESERVFAIL", "ECONNREFUSED"]) {
      expect(await checkDomainMail("x.org", resolverOf(bad("ENODATA"), bad(code))), code).toEqual({ accepts: false, reason: "lookup_failed" });
      expect(await checkDomainMail("x.org", resolverOf(bad(code), bad("ENODATA"))), code).toEqual({ accepts: false, reason: "lookup_failed" });
      expect(await checkDomainMail("x.org", resolverOf(bad("ENOTFOUND"), bad(code))), code).toEqual({ accepts: false, reason: "lookup_failed" });
    }
  });

  it("reports a missing domain over missing data, and missing data when both are empty", async () => {
    expect(await checkDomainMail("x.org", resolverOf(bad("ENODATA"), bad("ENOTFOUND")))).toEqual({ accepts: false, reason: "no_such_domain" });
    expect(await checkDomainMail("x.org", resolverOf(bad("ENODATA"), bad("ENODATA")))).toEqual({ accepts: false, reason: "no_mail_host" });
    expect(await checkDomainMail("x.org", resolverOf(ok([]), ok([])))).toEqual({ accepts: false, reason: "no_mail_host" });
  });
});
