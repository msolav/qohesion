import { fromHex } from "./hash.js";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Short code of an entry, shown to the voter as a receipt: the first 60 bits of the entry's leaf hash in Crockford base32,
 * as XXXX-XXXX-XXXX. The code finds the entry in the published ledger, where the full hash and an inclusion proof check it.
 * It reveals nothing about the choice, since the entry is encrypted.
 */
export function receiptCode(leafHashHex: string): string {
  const bytes = fromHex(leafHashHex);
  if (bytes.length < 8) throw new Error("A leaf hash is at least 8 bytes");
  let value = 0n;
  for (let i = 0; i < 8; i++) value = (value << 8n) | BigInt(bytes[i] ?? 0);
  value >>= 4n; // 64 bits down to 60
  let text = "";
  for (let i = 11; i >= 0; i--) text += CROCKFORD[Number((value >> BigInt(i * 5)) & 31n)];
  return `${text.slice(0, 4)}-${text.slice(4, 8)}-${text.slice(8, 12)}`;
}

/** Normalizes what a voter typed: case, spaces, hyphens, and the letters Crockford base32 treats as look-alikes. */
export function normalizeReceiptCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{12}$/.test(cleaned)) return null;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
}

/** Positions whose receipt code matches. Normally one; more than one is a collision, and the full hash settles it. */
export function findByReceipt(leafHashes: readonly string[], input: string): number[] {
  const code = normalizeReceiptCode(input);
  if (!code) return [];
  const found: number[] = [];
  leafHashes.forEach((hash, i) => { if (receiptCode(hash) === code) found.push(i); });
  return found;
}
