import { describe, expect, it } from "vitest";
import { MerkleLog, fromHex, hashLeaf, toHex, verifyConsistency, verifyInclusion } from "../src/index.js";

/** Leaves of the Certificate Transparency reference tests (hexadecimal). */
const CT_LEAVES = ["", "00", "10", "2021", "3031", "40414243", "5051525354555657", "606162636465666768696a6b6c6d6e6f"];

/**
 * Expected values were computed with a separate implementation (a direct transcription of RFC 9162 in Python).
 * The roots are the published Certificate Transparency test roots for trees of 0 to 8 leaves.
 */
const ROOTS = [
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "6e340b9cffb37a989ca544e6bb780a2c78901d3fb33738768511a30617afa01d",
  "fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125",
  "aeb6bcfe274b70a14fb067a5e5578264db0fa9b51af5e0ba159158f329e06e77",
  "d37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7",
  "4e3bbb1f7b478dcfe71fb631631519a3bca12c9aefca1612bfce4c13a86264d4",
  "76e67dadbcdf1e10e1b74ddc608abd2f98dfb16fbce75277b5232a127f2087ef",
  "ddb89be403809e325750d3d263cd78929c2942b7942a34b77e122c9594a74c8c",
  "5dc9da79a70659a9ad559cb701ded9a2ab9d823aad2f4960cfe370eff4604328",
];

const bytes = (n: number) => new TextEncoder().encode(`ballot-${n}`);

function logOf(n: number): MerkleLog {
  const log = new MerkleLog();
  for (let i = 0; i < n; i++) log.append(bytes(i));
  return log;
}

describe("roots", () => {
  it("match the Certificate Transparency reference roots for 0 to 8 leaves", () => {
    const log = new MerkleLog();
    expect(log.root()).toBe(ROOTS[0]);
    CT_LEAVES.forEach((hex, i) => {
      log.append(fromHex(hex));
      expect(log.size).toBe(i + 1);
      expect(log.root()).toBe(ROOTS[i + 1]);
    });
  });

  it("can be read for any earlier size after more entries were added", () => {
    const log = new MerkleLog();
    for (const hex of CT_LEAVES) log.append(fromHex(hex));
    ROOTS.forEach((root, size) => expect(log.root(size)).toBe(root));
  });

  it("hash a leaf and a node differently, so an entry cannot pass for a node", () => {
    const log = new MerkleLog();
    log.append(fromHex(""));
    expect(log.root()).not.toBe(ROOTS[0]);
    expect(toHex(hashLeaf(new Uint8Array(0)))).toBe(ROOTS[1]);
  });

  it("depend on the content, the order and the number of entries", () => {
    const a = new MerkleLog(); a.append(bytes(1)); a.append(bytes(2));
    const b = new MerkleLog(); b.append(bytes(2)); b.append(bytes(1));
    const c = new MerkleLog(); c.append(bytes(1)); c.append(bytes(2)); c.append(bytes(2));
    expect(new Set([a.root(), b.root(), c.root()]).size).toBe(3);
  });
});

describe("inclusion proofs", () => {
  it("match the reference proofs", () => {
    const log = new MerkleLog();
    for (const hex of CT_LEAVES) log.append(fromHex(hex));
    expect(log.inclusionProof(3, 7)).toEqual([
      "0298d122906dcfc10892cb53a73992fc5b9f493ea4c9badb27b791b4127a7fe7",
      "fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125",
      "837dbb152e9b079010717e84e865da4ebc0fa198a806d59d31bf15accef22d0e",
    ]);
    expect(log.inclusionProof(5, 8)).toEqual([
      "bc1a0643b12e4d2d7c77918f44e0f4f79a838b6cf9ec5b5c283e1f4d88599e6b",
      "ca854ea128ed050b41b35ffc1b87b8eb2bde461e9e3b5596ece6b9d5975a0ae0",
      "d37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7",
    ]);
  });

  it("verify for every entry of every tree size up to 40", () => {
    const log = logOf(40);
    for (let size = 1; size <= 40; size++) {
      const root = log.root(size);
      for (let index = 0; index < size; index++) {
        const claim = { leafHash: log.leafHash(index), index, size, path: log.inclusionProof(index, size), root };
        expect(verifyInclusion(claim), `entry ${index} of ${size}`).toBe(true);
      }
    }
  });

  it("verify in a tree of 1,000 entries and stay short (logarithmic)", () => {
    const log = logOf(1000);
    const root = log.root();
    for (const index of [0, 1, 499, 500, 998, 999]) {
      const path = log.inclusionProof(index);
      expect(path.length).toBeLessThanOrEqual(10);
      expect(verifyInclusion({ leafHash: log.leafHash(index), index, size: 1000, path, root })).toBe(true);
    }
  });

  it("fail for a different entry, position, size or root", () => {
    const log = logOf(13);
    const root = log.root();
    const good = { leafHash: log.leafHash(6), index: 6, size: 13, path: log.inclusionProof(6), root };
    expect(verifyInclusion(good)).toBe(true);
    expect(verifyInclusion({ ...good, leafHash: log.leafHash(7) })).toBe(false);
    expect(verifyInclusion({ ...good, index: 7 })).toBe(false);
    expect(verifyInclusion({ ...good, size: 40 })).toBe(false); // a tree of another shape
    expect(verifyInclusion({ ...good, root: logOf(12).root() })).toBe(false);
  });

  it("do not authenticate the size by themselves: sizes with the same shape give the same path", () => {
    // Entry 6 has the same path in trees of 13 and 14 entries. The pair (size, root) is bound by the checkpoint,
    // so the size is always read from a checkpoint and never from the proof.
    const log = logOf(13);
    const claim = { leafHash: log.leafHash(6), index: 6, size: 13, path: log.inclusionProof(6), root: log.root() };
    expect(verifyInclusion({ ...claim, size: 14 })).toBe(true);
  });

  it("fail when the path is altered, shortened, lengthened or reordered", () => {
    const log = logOf(13);
    const good = { leafHash: log.leafHash(6), index: 6, size: 13, path: log.inclusionProof(6), root: log.root() };
    const flipped = good.path.map((h, i) => (i === 1 ? `${h.slice(0, -1)}${h.endsWith("0") ? "1" : "0"}` : h));
    expect(verifyInclusion({ ...good, path: flipped })).toBe(false);
    expect(verifyInclusion({ ...good, path: good.path.slice(1) })).toBe(false);
    expect(verifyInclusion({ ...good, path: [...good.path, good.path[0] ?? ""] })).toBe(false);
    expect(verifyInclusion({ ...good, path: [...good.path].reverse() })).toBe(false);
  });

  it("reject malformed claims without throwing", () => {
    const log = logOf(5);
    const good = { leafHash: log.leafHash(2), index: 2, size: 5, path: log.inclusionProof(2), root: log.root() };
    expect(verifyInclusion({ ...good, leafHash: "zz" })).toBe(false);
    expect(verifyInclusion({ ...good, root: "abc" })).toBe(false);
    expect(verifyInclusion({ ...good, path: ["nothex"] })).toBe(false);
    expect(verifyInclusion({ ...good, index: -1 })).toBe(false);
    expect(verifyInclusion({ ...good, index: 5 })).toBe(false);
    expect(verifyInclusion({ ...good, index: 1.5 })).toBe(false);
  });

  it("are refused for positions and sizes that do not exist", () => {
    const log = logOf(4);
    expect(() => log.inclusionProof(4)).toThrow(RangeError);
    expect(() => log.inclusionProof(-1)).toThrow(RangeError);
    expect(() => log.inclusionProof(0, 5)).toThrow(RangeError);
    expect(() => log.inclusionProof(3, 3)).toThrow(RangeError);
    expect(() => log.leafHash(4)).toThrow(RangeError);
  });
});

describe("consistency proofs", () => {
  it("match the reference proofs", () => {
    const log = new MerkleLog();
    for (const hex of CT_LEAVES) log.append(fromHex(hex));
    expect(log.consistencyProof(3, 8)).toEqual([
      "0298d122906dcfc10892cb53a73992fc5b9f493ea4c9badb27b791b4127a7fe7",
      "07506a85fd9dd2f120eb694f86011e5bb4662e5c415a62917033d4a9624487e7",
      "fac54203e7cc696cf0dfcb42c92a1d9dbaf70ad9e621f4bd8d98662f00e3c125",
      "6b47aaf29ee3c2af9af889bc1fb9254dabd31177f16232dd6aab035ca39bf6e4",
    ]);
    expect(log.consistencyProof(6, 8)).toEqual([
      "0ebc5d3437fbe2db158b9f126a1d118e308181031d0a949f8dededebc558ef6a",
      "ca854ea128ed050b41b35ffc1b87b8eb2bde461e9e3b5596ece6b9d5975a0ae0",
      "d37ee418976dd95753c1c73862b9398fa2a2cf9b4ff0fdfe8b30cd95209614b7",
    ]);
    expect(log.consistencyProof(4, 7)).toEqual(["837dbb152e9b079010717e84e865da4ebc0fa198a806d59d31bf15accef22d0e"]);
  });

  it("verify for every pair of sizes up to 40", () => {
    const log = logOf(40);
    for (let second = 1; second <= 40; second++) {
      for (let first = 1; first <= second; first++) {
        const ok = verifyConsistency(
          { size: first, root: log.root(first) },
          { size: second, root: log.root(second) },
          log.consistencyProof(first, second),
        );
        expect(ok, `${first} within ${second}`).toBe(true);
      }
    }
  });

  it("fail when history was rewritten: an earlier entry changed", () => {
    const honest = logOf(20);
    const rewritten = new MerkleLog();
    for (let i = 0; i < 20; i++) rewritten.append(i === 3 ? bytes(999) : bytes(i));
    const proof = rewritten.consistencyProof(10, 20);
    // The rewritten ledger cannot show the honest earlier checkpoint as its own prefix.
    expect(verifyConsistency({ size: 10, root: honest.root(10) }, { size: 20, root: rewritten.root() }, proof)).toBe(false);
    // Nor can it be proved with the honest ledger's proof.
    expect(verifyConsistency({ size: 10, root: honest.root(10) }, { size: 20, root: rewritten.root() }, honest.consistencyProof(10, 20))).toBe(false);
  });

  it("fail when an entry was dropped from the middle", () => {
    const honest = logOf(12);
    const dropped = new MerkleLog();
    for (let i = 0; i < 12; i++) if (i !== 5) dropped.append(bytes(i));
    dropped.append(bytes(100));
    expect(verifyConsistency({ size: 8, root: honest.root(8) }, { size: dropped.size, root: dropped.root() }, dropped.consistencyProof(8, dropped.size))).toBe(false);
  });

  it("fail for a wrong size, root or proof", () => {
    const log = logOf(21);
    const first = { size: 9, root: log.root(9) };
    const second = { size: 21, root: log.root() };
    const proof = log.consistencyProof(9, 21);
    expect(verifyConsistency(first, second, proof)).toBe(true);
    expect(verifyConsistency({ ...first, size: 10 }, second, proof)).toBe(false);
    expect(verifyConsistency(first, { ...second, size: 100 }, proof)).toBe(false); // a tree of another shape
    expect(verifyConsistency({ ...first, root: log.root(8) }, second, proof)).toBe(false);
    expect(verifyConsistency(first, second, proof.slice(1))).toBe(false);
    expect(verifyConsistency(first, second, [])).toBe(false);
    expect(verifyConsistency(first, second, [...proof, proof[0] ?? ""])).toBe(false);
  });

  it("handle equal sizes: only an empty proof and the same root pass", () => {
    const log = logOf(7);
    const head = { size: 7, root: log.root() };
    expect(verifyConsistency(head, head, [])).toBe(true);
    expect(verifyConsistency(head, head, [log.root()])).toBe(false);
    expect(verifyConsistency(head, { size: 7, root: logOf(6).root() }, [])).toBe(false);
  });

  it("reject impossible or malformed arguments without throwing", () => {
    const log = logOf(6);
    const head = { size: 6, root: log.root() };
    expect(verifyConsistency({ size: 0, root: log.root(0) }, head, [])).toBe(false);
    expect(verifyConsistency({ size: 7, root: head.root }, head, [])).toBe(false);
    expect(verifyConsistency({ size: 3, root: log.root(3) }, head, ["nothex"])).toBe(false);
    expect(() => log.consistencyProof(0, 6)).toThrow(RangeError);
    expect(() => log.consistencyProof(7, 6)).toThrow(RangeError);
    expect(() => log.consistencyProof(3, 7)).toThrow(RangeError);
  });
});

describe("log", () => {
  it("returns positions in order and exposes leaf hashes", () => {
    const log = new MerkleLog();
    expect(log.append(bytes(0))).toBe(0);
    expect(log.append(bytes(1))).toBe(1);
    expect(log.leafHashes()).toEqual([log.leafHash(0), log.leafHash(1)]);
    expect(log.leafHash(0)).toBe(toHex(hashLeaf(bytes(0))));
  });

  it("does not let the caller change an entry afterwards", () => {
    const log = new MerkleLog();
    const data = bytes(1);
    log.append(data);
    const before = log.root();
    data[0] = 0;
    expect(log.root()).toBe(before);
  });

  it("refuses a root for a size beyond its entries", () => {
    expect(() => logOf(3).root(4)).toThrow(RangeError);
    expect(() => logOf(3).root(-1)).toThrow(RangeError);
  });
});
