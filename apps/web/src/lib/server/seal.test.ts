// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { generateCountingKeys, keyMatches, normalizeCountingKey, open, seal } from "./seal.js";

describe("sealed ballots", () => {
  it("opens with the counting key and with no other", () => {
    const a = generateCountingKeys();
    const b = generateCountingKeys();
    const sealed = seal(a.publicKey, "against");
    expect(open(a.countingKey, sealed)).toBe("against");
    expect(open(b.countingKey, sealed)).toBeNull();
  });

  it("gives a different ciphertext each time and hides the choice", () => {
    const { publicKey } = generateCountingKeys();
    const one = seal(publicKey, "for");
    expect(one).not.toBe(seal(publicKey, "for"));
    expect(Buffer.from(one, "base64url").toString("latin1")).not.toContain("for");
  });

  it("refuses a ballot that was altered", () => {
    const keys = generateCountingKeys();
    const sealed = Buffer.from(seal(keys.publicKey, "for"), "base64url");
    sealed[sealed.length - 1] = (sealed[sealed.length - 1] ?? 0) ^ 1;
    expect(open(keys.countingKey, sealed.toString("base64url"))).toBeNull();
    expect(open(keys.countingKey, "short")).toBeNull();
  });

  it("writes the counting key in groups and accepts any spelling of it", () => {
    const { countingKey, publicKey } = generateCountingKeys();
    expect(countingKey).toMatch(/^QC(-[0-9A-Z]{1,4}){13}$/);
    const sloppy = countingKey.toLowerCase().replaceAll("-", "  ");
    expect(normalizeCountingKey(sloppy)).toBe(normalizeCountingKey(countingKey));
    expect(keyMatches(sloppy, publicKey)).toBe(true);
    expect(open(sloppy, seal(publicKey, "abstain"))).toBe("abstain");
  });

  it("recognises a key that does not belong to the poll", () => {
    const a = generateCountingKeys();
    const b = generateCountingKeys();
    expect(keyMatches(b.countingKey, a.publicKey)).toBe(false);
    expect(keyMatches("not a key", a.publicKey)).toBe(false);
  });
});
