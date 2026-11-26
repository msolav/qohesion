import { describe, expect, it } from "vitest";
import { checkDomainMail, type MailResolver, type MxRecord } from "../src/index.js";

const fail = (code: string) => Object.assign(new Error(code), { code });

/** A resolver built from fixed answers. A value that is an Error is thrown. */
function resolver(mx: readonly MxRecord[] | Error, address: readonly string[] | Error): MailResolver {
  const answer = <T>(v: T | Error): Promise<T> => (v instanceof Error ? Promise.reject(v) : Promise.resolve(v));
  return { resolveMx: () => answer(mx), resolveAddress: () => answer(address) };
}

describe("checkDomainMail", () => {
  it("accepts a domain with MX records", async () => {
    expect(await checkDomainMail("exemple.ca", resolver([{ exchange: "mx1.exemple.ca", priority: 10 }], fail("ENODATA")))).toEqual({ accepts: true, via: "mx" });
  });

  it("accepts a domain with several MX records, one of them the null MX", async () => {
    const mx = [{ exchange: ".", priority: 0 }, { exchange: "mx.exemple.ca", priority: 10 }];
    expect(await checkDomainMail("exemple.ca", resolver(mx, []))).toEqual({ accepts: true, via: "mx" });
  });

  it("refuses a domain that publishes the null MX (RFC 7505)", async () => {
    expect(await checkDomainMail("exemple.ca", resolver([{ exchange: ".", priority: 0 }], ["192.0.2.1"]))).toEqual({ accepts: false, reason: "null_mx" });
    expect(await checkDomainMail("exemple.ca", resolver([{ exchange: "", priority: 0 }], ["192.0.2.1"]))).toEqual({ accepts: false, reason: "null_mx" });
  });

  it("falls back to the address records when there is no MX record (implicit MX)", async () => {
    expect(await checkDomainMail("exemple.ca", resolver(fail("ENODATA"), ["192.0.2.1"]))).toEqual({ accepts: true, via: "address" });
    expect(await checkDomainMail("exemple.ca", resolver([], ["2001:db8::1"]))).toEqual({ accepts: true, via: "address" });
  });

  it("refuses a domain with neither MX nor address records", async () => {
    expect(await checkDomainMail("exemple.ca", resolver(fail("ENODATA"), fail("ENODATA")))).toEqual({ accepts: false, reason: "no_mail_host" });
    expect(await checkDomainMail("exemple.ca", resolver([], []))).toEqual({ accepts: false, reason: "no_mail_host" });
  });

  it("refuses a domain that does not exist, whichever lookup says so", async () => {
    expect(await checkDomainMail("nexiste-pas.ca", resolver(fail("ENOTFOUND"), fail("ENOTFOUND")))).toEqual({ accepts: false, reason: "no_such_domain" });
    expect(await checkDomainMail("nexiste-pas.ca", resolver(fail("ENODATA"), fail("ENOTFOUND")))).toEqual({ accepts: false, reason: "no_such_domain" });
  });

  it("reports a temporary failure as such, so the caller does not turn away a valid address", async () => {
    expect(await checkDomainMail("exemple.ca", resolver(fail("ETIMEOUT"), []))).toEqual({ accepts: false, reason: "lookup_failed" });
    expect(await checkDomainMail("exemple.ca", resolver(fail("ESERVFAIL"), []))).toEqual({ accepts: false, reason: "lookup_failed" });
    expect(await checkDomainMail("exemple.ca", resolver(fail("ENODATA"), fail("ETIMEOUT")))).toEqual({ accepts: false, reason: "lookup_failed" });
    expect(await checkDomainMail("exemple.ca", resolver(new Error("no code"), []))).toEqual({ accepts: false, reason: "lookup_failed" });
  });

  it("does not look up the address records when MX records answer", async () => {
    let addressLookups = 0;
    const r: MailResolver = {
      resolveMx: async () => [{ exchange: "mx.exemple.ca", priority: 1 }],
      resolveAddress: async () => { addressLookups++; return []; },
    };
    await checkDomainMail("exemple.ca", r);
    expect(addressLookups).toBe(0);
  });
});
