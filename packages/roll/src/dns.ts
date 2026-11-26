import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import type { MailResolver } from "./domain.js";

type Lookup<T> = (domain: string) => Promise<T>;

/**
 * Builds a resolver from lookup functions. Address lookups combine IPv4 and IPv6 and succeed if either has records.
 * When neither does, the error reported is the most serious one: a temporary failure first (the answer is unknown, not
 * negative), then a missing domain, then missing data.
 */
export function makeMailResolver(
  mx: Lookup<readonly { exchange: string; priority: number }[]>,
  a: Lookup<readonly string[]>,
  aaaa: Lookup<readonly string[]>,
): MailResolver {
  return {
    resolveMx: (domain) => mx(domain),
    async resolveAddress(domain) {
      const [v4, v6] = await Promise.allSettled([a(domain), aaaa(domain)]);
      const found = [...(v4.status === "fulfilled" ? v4.value : []), ...(v6.status === "fulfilled" ? v6.value : [])];
      if (found.length > 0) return found;
      const reasons = [v4, v6].filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason as { code?: string });
      const definite = (r: { code?: string }) => r.code === "ENOTFOUND" || r.code === "ENODATA";
      const pick = reasons.find((r) => !definite(r)) ?? reasons.find((r) => r.code === "ENOTFOUND") ?? reasons.find((r) => r.code === "ENODATA");
      if (pick) throw pick;
      return [];
    },
  };
}

/** The real resolver, for the server. */
export const nodeMailResolver: MailResolver = makeMailResolver(resolveMx, resolve4, resolve6);
