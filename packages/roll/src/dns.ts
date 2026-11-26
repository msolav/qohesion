import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import type { MailResolver } from "./domain.js";

/** The real resolver, for the server. Address lookups combine IPv4 and IPv6, and succeed if either has records. */
export const nodeMailResolver: MailResolver = {
  resolveMx: (domain) => resolveMx(domain),
  async resolveAddress(domain) {
    const [v4, v6] = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
    const found = [...(v4.status === "fulfilled" ? v4.value : []), ...(v6.status === "fulfilled" ? v6.value : [])];
    if (found.length > 0) return found;
    // Report the more informative failure: a missing domain over missing data over a temporary problem.
    const reasons = [v4, v6].filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason as { code?: string });
    const pick = reasons.find((r) => r.code === "ENOTFOUND") ?? reasons.find((r) => r.code === "ENODATA") ?? reasons[0];
    if (pick) throw pick;
    return [];
  },
};
