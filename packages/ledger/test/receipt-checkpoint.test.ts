import { describe, expect, it } from "vitest";
import {
  MerkleLog, checkpointDigest, findByReceipt, formatCheckpoint, normalizeReceiptCode, parseCheckpoint, receiptCode, sha256, toHex,
} from "../src/index.js";

describe("receipt code", () => {
  it("is the first 60 bits of the leaf hash in Crockford base32, as XXXX-XXXX-XXXX", () => {
    // Value computed apart: the top 60 bits of 0x0123456789abcdef.
    expect(receiptCode("0123456789abcdef" + "00".repeat(24))).toBe("04HM-ASW9-NF6Y");
  });

  it("uses only the 32 Crockford characters", () => {
    const log = new MerkleLog();
    for (let i = 0; i < 200; i++) {
      log.append(new TextEncoder().encode(`b${i}`));
      expect(receiptCode(log.leafHash(i))).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    }
  });

  it("differs between entries and does not change for the same entry", () => {
    const log = new MerkleLog();
    log.append(new TextEncoder().encode("a"));
    log.append(new TextEncoder().encode("b"));
    expect(receiptCode(log.leafHash(0))).not.toBe(receiptCode(log.leafHash(1)));
    expect(receiptCode(log.leafHash(0))).toBe(receiptCode(log.leafHash(0)));
  });

  it("refuses a hash that is too short or not hexadecimal", () => {
    expect(() => receiptCode("00ff")).toThrow();
    expect(() => receiptCode("zz".repeat(32))).toThrow();
  });
});

describe("normalizeReceiptCode", () => {
  it("accepts case, spaces and missing hyphens", () => {
    expect(normalizeReceiptCode("k7qm-4x2r-9ptd")).toBe("K7QM-4X2R-9PTD");
    expect(normalizeReceiptCode(" K7QM 4X2R 9PTD ")).toBe("K7QM-4X2R-9PTD");
    expect(normalizeReceiptCode("K7QM4X2R9PTD")).toBe("K7QM-4X2R-9PTD");
  });

  it("reads look-alike letters as Crockford does: O as 0, I and L as 1", () => {
    expect(normalizeReceiptCode("O0IL-4X2R-9PTD")).toBe("0011-4X2R-9PTD");
  });

  it("rejects the wrong length or characters", () => {
    for (const bad of ["", "K7QM-4X2R", "K7QM-4X2R-9PTDD", "K7QM-4X2R-9PTU", "K7QM-4X2R-9PT!"]) expect(normalizeReceiptCode(bad)).toBeNull();
  });
});

describe("findByReceipt", () => {
  const log = new MerkleLog();
  for (let i = 0; i < 50; i++) log.append(new TextEncoder().encode(`ballot ${i}`));
  const hashes = log.leafHashes();

  it("finds the entry for the code a voter was shown, however it was typed", () => {
    const code = receiptCode(hashes[17] ?? "");
    expect(findByReceipt(hashes, code)).toEqual([17]);
    expect(findByReceipt(hashes, code.toLowerCase().replace(/-/g, " "))).toEqual([17]);
  });

  it("finds nothing for an unknown or malformed code", () => {
    expect(findByReceipt(hashes, "0000-0000-0000")).toEqual([]);
    expect(findByReceipt(hashes, "nope")).toEqual([]);
  });
});

describe("checkpoint", () => {
  const root = "5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328";
  const checkpoint = { origin: "poll:2027-budget", size: 8, root };

  it("has a fixed text form", () => {
    expect(formatCheckpoint(checkpoint)).toBe(`qohesion-checkpoint-v1\npoll:2027-budget\n8\n${root}\n`);
  });

  it("reads back what it wrote", () => {
    expect(parseCheckpoint(formatCheckpoint(checkpoint))).toEqual(checkpoint);
    expect(parseCheckpoint(formatCheckpoint({ ...checkpoint, size: 0 }))).toEqual({ ...checkpoint, size: 0 });
  });

  it("rejects text that is not exactly the canonical form", () => {
    const good = formatCheckpoint(checkpoint);
    for (const bad of [
      good.trimEnd(), `${good}\n`, good.replace("v1", "v2"), good.replace("\n8\n", "\n08\n"), good.replace("\n8\n", "\n-8\n"),
      good.replace(root, root.toUpperCase()), good.replace(root, root.slice(1)), good.replace("poll:2027-budget", "poll 2027"),
      good.replace(/\n/g, "\r\n"), "", "qohesion-checkpoint-v1\n",
    ]) expect(parseCheckpoint(bad), JSON.stringify(bad)).toBeNull();
  });

  it("refuses to write invalid fields", () => {
    expect(() => formatCheckpoint({ ...checkpoint, origin: "a\nb" })).toThrow(/origin/);
    expect(() => formatCheckpoint({ ...checkpoint, origin: "" })).toThrow(/origin/);
    expect(() => formatCheckpoint({ ...checkpoint, size: -1 })).toThrow(/size/);
    expect(() => formatCheckpoint({ ...checkpoint, size: 1.5 })).toThrow(/size/);
    expect(() => formatCheckpoint({ ...checkpoint, root: "abc" })).toThrow(/root/);
  });

  it("has a digest that is the SHA-256 of the text form and changes with any field", () => {
    expect(checkpointDigest(checkpoint)).toBe(toHex(sha256(new TextEncoder().encode(formatCheckpoint(checkpoint)))));
    const digests = new Set([
      checkpointDigest(checkpoint), checkpointDigest({ ...checkpoint, size: 9 }), checkpointDigest({ ...checkpoint, origin: "poll:other" }),
      checkpointDigest({ ...checkpoint, root: root.replace("5", "6") }),
    ]);
    expect(digests.size).toBe(4);
  });

  it("describes a real ledger", () => {
    const log = new MerkleLog();
    for (let i = 0; i < 5; i++) log.append(new TextEncoder().encode(`${i}`));
    const c = { origin: "poll:x", size: log.size, root: log.root() };
    expect(parseCheckpoint(formatCheckpoint(c))).toEqual(c);
  });
});
