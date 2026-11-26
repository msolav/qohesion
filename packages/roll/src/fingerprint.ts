import { createHmac } from "node:crypto";
import { normalizeAddress } from "./address.js";

/**
 * Keyed fingerprint of an address. The same address always gives the same value for the same key, so lists can be
 * compared across organizations without keeping or exposing the address itself. Without the key the value cannot be
 * reversed by trying known addresses.
 */
export function addressFingerprint(address: string, key: Uint8Array | string): string {
  const canonical = normalizeAddress(address);
  if (!canonical) throw new Error("Invalid address");
  const bytes = typeof key === "string" ? new TextEncoder().encode(key) : key;
  if (bytes.length < 16) throw new Error("The fingerprint key must be at least 16 bytes");
  return createHmac("sha256", bytes).update(canonical).digest("base64url").slice(0, 32);
}

export interface Overlap {
  readonly common: number;
  /** Share of the smaller list that is also in the other one. */
  readonly containment: number;
  readonly jaccard: number;
}

export function overlap(a: ReadonlySet<string>, b: ReadonlySet<string>): Overlap {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let common = 0;
  for (const value of small) if (large.has(value)) common++;
  const union = a.size + b.size - common;
  return { common, containment: small.size === 0 ? 0 : common / small.size, jaccard: union === 0 ? 0 : common / union };
}

/**
 * True when two lists share so much that their organizers are probably the same group. Small overlaps are normal
 * (a person can belong to several groups), so a minimum number of shared addresses is required as well.
 */
export function likelySameGroup(o: Overlap, options: { threshold?: number; minCommon?: number } = {}): boolean {
  const threshold = options.threshold ?? 0.7;
  const minCommon = options.minCommon ?? 5;
  return o.common >= minCommon && o.containment >= threshold;
}
