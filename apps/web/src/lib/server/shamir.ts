// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Shamir's secret sharing over GF(256), byte by byte: a secret is cut into `n` shares of which any `k` give it back and
 * fewer than `k` give no information about it. It splits the counting key between administrators (ADR 0008, section 5).
 * The dealer who cuts the key holds all of it for that moment: only a distributed key generation removes that, which the
 * audited scheme of ADR 0002 will do.
 */

import { randomBytes } from "node:crypto";

// Multiplication and inverse in GF(2^8) with the polynomial x^8 + x^4 + x^3 + x + 1.
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    // multiply by the generator 3: x*3 = x xor (x*2)
    let doubled = x << 1;
    if (doubled & 0x100) doubled ^= 0x11b;
    x = (doubled ^ x) & 0xff;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255] ?? 0;
})();

const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : (EXP[(LOG[a] ?? 0) + (LOG[b] ?? 0)] ?? 0));
const inv = (a: number): number => {
  if (a === 0) throw new Error("No inverse of zero");
  return EXP[255 - (LOG[a] ?? 0)] ?? 0;
};

export interface Share {
  /** The point the share was taken at, from 1 to 255. */
  readonly x: number;
  readonly y: Uint8Array;
}

/** Cuts a secret into `n` shares, any `k` of which rebuild it. */
export function split(secret: Uint8Array, k: number, n: number): Share[] {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 2 || n < k || n > 255) throw new RangeError("Need 2 <= k <= n <= 255");
  const shares: Share[] = Array.from({ length: n }, (_, i) => ({ x: i + 1, y: new Uint8Array(secret.length) }));
  for (let b = 0; b < secret.length; b++) {
    // A random polynomial of degree k - 1 whose constant term is the secret byte.
    const coefficients = [secret[b] ?? 0, ...randomBytes(k - 1)];
    for (const share of shares) {
      let y = 0;
      for (let d = coefficients.length - 1; d >= 0; d--) y = mul(y, share.x) ^ (coefficients[d] ?? 0);
      share.y[b] = y;
    }
  }
  return shares;
}

/** Rebuilds the secret from at least `k` different shares. With fewer, the result is wrong without telling. */
export function combine(shares: readonly Share[]): Uint8Array {
  if (shares.length === 0) throw new RangeError("No shares");
  const xs = new Set(shares.map((s) => s.x));
  if (xs.size !== shares.length) throw new RangeError("Shares must be different");
  const length = shares[0]?.y.length ?? 0;
  if (shares.some((s) => s.y.length !== length)) throw new RangeError("Shares must have the same length");
  const secret = new Uint8Array(length);
  for (let b = 0; b < length; b++) {
    let value = 0;
    for (const si of shares) {
      // Lagrange basis at zero: the product over the other points of x_j / (x_j xor x_i).
      let basis = 1;
      for (const sj of shares) if (sj !== si) basis = mul(basis, mul(sj.x, inv(sj.x ^ si.x)));
      value ^= mul(si.y[b] ?? 0, basis);
    }
    secret[b] = value;
  }
  return secret;
}
