// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { combine, split } from "./shamir.js";

const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

describe("secret sharing", () => {
  it("rebuilds the secret from any k shares out of n", () => {
    const secret = randomBytes(32);
    const shares = split(secret, 3, 5);
    expect(shares).toHaveLength(5);
    for (const picked of [[0, 1, 2], [4, 2, 0], [1, 3, 4], [0, 1, 2, 3, 4]]) {
      expect(same(combine(picked.map((i) => shares[i] ?? shares[0]!)), secret)).toBe(true);
    }
  });

  it("gives a wrong answer with fewer than k shares, and no share equals the secret", () => {
    const secret = randomBytes(32);
    const shares = split(secret, 3, 4);
    expect(same(combine(shares.slice(0, 2)), secret)).toBe(false);
    expect(same(combine(shares.slice(0, 1)), secret)).toBe(false);
    for (const s of shares) expect(same(s.y, secret)).toBe(false);
  });

  it("works for 2 of 2 and for every byte value", () => {
    const secret = Uint8Array.from({ length: 256 }, (_, i) => i);
    const shares = split(secret, 2, 2);
    expect(same(combine(shares), secret)).toBe(true);
  });

  it("gives different shares each time for the same secret", () => {
    const secret = randomBytes(16);
    expect(same(split(secret, 2, 3)[0]!.y, split(secret, 2, 3)[0]!.y)).toBe(false);
  });

  it("refuses bad parameters and repeated shares", () => {
    expect(() => split(randomBytes(4), 1, 3)).toThrow();
    expect(() => split(randomBytes(4), 4, 3)).toThrow();
    const shares = split(randomBytes(4), 2, 3);
    expect(() => combine([shares[0]!, shares[0]!])).toThrow();
    expect(() => combine([])).toThrow();
  });
});
