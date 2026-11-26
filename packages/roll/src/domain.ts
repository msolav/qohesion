/**
 * Does a domain accept mail? Used when an administrator enters addresses, to catch a domain that does not exist before
 * a message is sent to it (ADR 0003, section 4). The lookup itself is injected, so the rules are testable and the server
 * supplies the real resolver (see dns.ts).
 *
 * Rules (RFC 5321, section 5.1, and RFC 7505):
 *  1. MX records exist and are not the null MX ("."): the domain accepts mail.
 *  2. A single null MX: the domain states that it accepts no mail.
 *  3. No MX records: the domain's own address records act as the mail host (implicit MX).
 *  4. The domain does not exist, or has neither MX nor address records: no mail can be delivered.
 *  5. Any other failure (timeout, server failure) is reported as such. The caller decides; blocking an address for a
 *     temporary DNS problem would turn away a valid member.
 */

export interface MxRecord {
  readonly exchange: string;
  readonly priority: number;
}

/** Lookups return records, or throw an error whose `code` is the DNS error ("ENOTFOUND", "ENODATA", others). */
export interface MailResolver {
  resolveMx(domain: string): Promise<readonly MxRecord[]>;
  resolveAddress(domain: string): Promise<readonly string[]>;
}

export type DomainMail =
  | { readonly accepts: true; readonly via: "mx" | "address" }
  | { readonly accepts: false; readonly reason: "no_such_domain" | "null_mx" | "no_mail_host" | "lookup_failed" };

type Lookup<T> = { readonly kind: "found"; readonly value: T } | { readonly kind: "none" } | { readonly kind: "nxdomain" } | { readonly kind: "failed" };

async function lookup<T>(run: () => Promise<readonly T[]>): Promise<Lookup<readonly T[]>> {
  try {
    const value = await run();
    return value.length > 0 ? { kind: "found", value } : { kind: "none" };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "ENOTFOUND" || code === "NXDOMAIN") return { kind: "nxdomain" };
    if (code === "ENODATA" || code === "NODATA") return { kind: "none" };
    return { kind: "failed" };
  }
}

const isNullMx = (r: MxRecord) => r.exchange === "" || r.exchange === ".";

export async function checkDomainMail(domain: string, resolver: MailResolver): Promise<DomainMail> {
  const mx = await lookup(() => resolver.resolveMx(domain));
  if (mx.kind === "found") {
    if (mx.value.length === 1 && mx.value.every(isNullMx)) return { accepts: false, reason: "null_mx" };
    return mx.value.some((r) => !isNullMx(r)) ? { accepts: true, via: "mx" } : { accepts: false, reason: "null_mx" };
  }
  if (mx.kind === "failed") return { accepts: false, reason: "lookup_failed" };
  if (mx.kind === "nxdomain") return { accepts: false, reason: "no_such_domain" };

  // No MX records: the address records of the domain itself stand in as the mail host.
  const address = await lookup(() => resolver.resolveAddress(domain));
  if (address.kind === "found") return { accepts: true, via: "address" };
  if (address.kind === "failed") return { accepts: false, reason: "lookup_failed" };
  if (address.kind === "nxdomain") return { accepts: false, reason: "no_such_domain" };
  return { accepts: false, reason: "no_mail_host" };
}
