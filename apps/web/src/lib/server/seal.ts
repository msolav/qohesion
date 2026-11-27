// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Sealed ballots of the test edition (ADR 0007, section 3). Each ballot is encrypted to a public key chosen when the
 * poll opens (X25519 key agreement, HKDF-SHA-256, AES-256-GCM, a fresh ephemeral key per ballot). The matching private
 * key, the "counting key", is shown once to the administrator and never stored: without it nobody can read the ballots.
 *
 * Limits, stated to the people who use it: the server encrypts the ballot as soon as it receives it, so it sees the
 * choice for that moment; and at the count the administrator hands the key to the server, which reads the ballots in
 * memory. This is not the audited scheme with a threshold key that the final product needs (ADR 0002).
 */

import { combine, split, type Share } from "./shamir.js";
import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes } from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PKCS8_PREFIX = Buffer.from("302e020100300506032b656e04220420", "hex");
const SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");
const INFO = Buffer.from("qohesion-ballot-v1");

function toBase32(bytes: Uint8Array): string {
  let out = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += CROCKFORD[(value >> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += CROCKFORD[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(text: string, bytes: number): Buffer | null {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of text) {
    const index = CROCKFORD.indexOf(char);
    if (index === -1) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 255);
      value &= (1 << bits) - 1;
    }
  }
  return out.length >= bytes ? Buffer.from(out.slice(0, bytes)) : null;
}

/** Spelling of a counting key as typed: case, spaces, hyphens, and look-alike letters do not matter. */
export function normalizeCountingKey(input: string): string {
  return input.toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/[^0-9A-Z]/g, "").replace(/^QC/, "");
}

export function formatCountingKey(bytes: Uint8Array): string {
  const text = toBase32(bytes);
  return `QC-${(text.match(/.{1,4}/g) ?? []).join("-")}`;
}

/** A new key pair: the public key goes in the poll, the counting key goes to the administrator once. */
export function generateCountingKeys(): { publicKey: string; countingKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  const publicRaw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  const privateRaw = privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32);
  return { publicKey: Buffer.from(publicRaw).toString("base64url"), countingKey: formatCountingKey(privateRaw) };
}

function privateFromCountingKey(countingKey: string) {
  const raw = fromBase32(normalizeCountingKey(countingKey), 32);
  if (!raw) return null;
  try {
    return createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, raw]), format: "der", type: "pkcs8" });
  } catch {
    return null;
  }
}

/** True when the counting key is the private half of the public key. */
export function keyMatches(countingKey: string, publicKey: string): boolean {
  const priv = privateFromCountingKey(countingKey);
  if (!priv) return false;
  const derived = createPublicKey(priv).export({ format: "der", type: "spki" }).subarray(-32);
  return Buffer.from(derived).toString("base64url") === publicKey;
}

export function seal(publicKey: string, plaintext: string): string {
  const recipient = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKey, "base64url")]), format: "der", type: "spki" });
  const ephemeral = generateKeyPairSync("x25519");
  const ephemeralPublic = Buffer.from(ephemeral.publicKey.export({ format: "der", type: "spki" }).subarray(-32));
  const shared = diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipient });
  const key = Buffer.from(hkdfSync("sha256", shared, ephemeralPublic, INFO, 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([ephemeralPublic, iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The plaintext of a sealed ballot, or null when the key is wrong or the ballot was altered. */
export function open(countingKey: string, sealed: string): string | null {
  const priv = privateFromCountingKey(countingKey);
  if (!priv) return null;
  try {
    const data = Buffer.from(sealed, "base64url");
    if (data.length < 32 + 12 + 16 + 1) return null;
    const ephemeralPublic = data.subarray(0, 32);
    const iv = data.subarray(32, 44);
    const tag = data.subarray(44, 60);
    const body = data.subarray(60);
    const sender = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, ephemeralPublic]), format: "der", type: "spki" });
    const shared = diffieHellman({ privateKey: priv, publicKey: sender });
    const key = Buffer.from(hkdfSync("sha256", shared, ephemeralPublic, INFO, 32));
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** A key pair whose private half is kept as raw bytes, so that it can be cut into shares. */
export function generateCountingKeyBytes(): { publicKey: string; secret: Uint8Array } {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  return {
    publicKey: Buffer.from(publicKey.export({ format: "der", type: "spki" }).subarray(-32)).toString("base64url"),
    secret: Uint8Array.from(privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32)),
  };
}

/** One share written for a person to keep: the number needed, its place, and its bytes, as "QS-2-1-XXXX-XXXX-...". */
export function formatShare(k: number, share: Share): string {
  const text = toBase32(share.y);
  return `QS-${k}-${share.x}-${(text.match(/.{1,4}/g) ?? []).join("-")}`;
}

const SHARE = /QS-(\d{1,2})-(\d{1,3})-([0-9A-Za-z-]+)/gi;

/** The shares found in a text, in any spelling of their letters. */
export function parseShares(input: string): { k: number; share: Share }[] {
  const found: { k: number; share: Share }[] = [];
  for (const m of input.toUpperCase().matchAll(SHARE)) {
    const bytes = fromBase32(m[3]!.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/[^0-9A-Z]/g, ""), 32);
    const x = Number(m[2]);
    if (bytes && x >= 1 && x <= 255) found.push({ k: Number(m[1]), share: { x, y: Uint8Array.from(bytes) } });
  }
  return found;
}

/**
 * What an administrator typed to open the ballots: a counting key as it is, or shares (one per administrator, in any layout)
 * that are put together. Fewer shares than needed give a key that does not fit, which the poll then refuses.
 */
export function keyFromInput(input: string): string {
  const shares = parseShares(input);
  if (shares.length === 0) return input;
  try {
    return formatCountingKey(combine(shares.map((s) => s.share)));
  } catch {
    return "";
  }
}

/** Cuts a counting key into `n` shares of which `k` open the ballots. */
export function shareSecret(secret: Uint8Array, k: number, n: number): string[] {
  return split(secret, k, n).map((s) => formatShare(k, s));
}
