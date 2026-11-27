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

function formatCountingKey(bytes: Uint8Array): string {
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
