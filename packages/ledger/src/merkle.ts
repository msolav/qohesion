import { concat, equalBytes, fromHex, sha256, toHex, type Hasher } from "./hash.js";

/**
 * Merkle tree hashing and proofs as specified in RFC 9162, section 2 (the construction used by Certificate Transparency),
 * with SHA-256. Leaves and inner nodes are hashed with different prefixes, so a leaf can never be mistaken for a node.
 *
 *   empty tree     SHA-256("")
 *   leaf           SHA-256(0x00 || data)
 *   inner node     SHA-256(0x01 || left || right)
 *
 * A tree of n leaves splits at k, the largest power of two smaller than n.
 */

const LEAF = new Uint8Array([0x00]);
const NODE = new Uint8Array([0x01]);

export const hashLeaf = (data: Uint8Array, hash: Hasher = sha256): Uint8Array => hash(concat(LEAF, data));
export const hashNode = (left: Uint8Array, right: Uint8Array, hash: Hasher = sha256): Uint8Array => hash(concat(NODE, left, right));
export const emptyRoot = (hash: Hasher = sha256): Uint8Array => hash(new Uint8Array(0));

/** Largest power of two strictly smaller than n (n >= 2). */
function split(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

/** Root of the tree over leaf hashes[start, start + size). */
function rangeRoot(leaves: readonly Uint8Array[], start: number, size: number, hash: Hasher, cache: Map<string, Uint8Array>): Uint8Array {
  if (size === 0) return emptyRoot(hash);
  if (size === 1) {
    const leaf = leaves[start];
    if (!leaf) throw new Error("Leaf out of range");
    return leaf;
  }
  // Complete subtrees never change once built, so they can be remembered.
  const key = isPowerOfTwo(size) ? `${start}:${size}` : undefined;
  const hit = key ? cache.get(key) : undefined;
  if (hit) return hit;
  const k = split(size);
  const root = hashNode(rangeRoot(leaves, start, k, hash, cache), rangeRoot(leaves, start + k, size - k, hash, cache), hash);
  if (key) cache.set(key, root);
  return root;
}

function inclusionPath(leaves: readonly Uint8Array[], index: number, start: number, size: number, hash: Hasher, cache: Map<string, Uint8Array>): Uint8Array[] {
  if (size === 1) return [];
  const k = split(size);
  return index < k
    ? [...inclusionPath(leaves, index, start, k, hash, cache), rangeRoot(leaves, start + k, size - k, hash, cache)]
    : [...inclusionPath(leaves, index - k, start + k, size - k, hash, cache), rangeRoot(leaves, start, k, hash, cache)];
}

function consistencyPath(leaves: readonly Uint8Array[], first: number, start: number, size: number, complete: boolean, hash: Hasher, cache: Map<string, Uint8Array>): Uint8Array[] {
  if (first === size) return complete ? [] : [rangeRoot(leaves, start, size, hash, cache)];
  const k = split(size);
  return first <= k
    ? [...consistencyPath(leaves, first, start, k, complete, hash, cache), rangeRoot(leaves, start + k, size - k, hash, cache)]
    : [...consistencyPath(leaves, first - k, start + k, size - k, false, hash, cache), rangeRoot(leaves, start, k, hash, cache)];
}

/** An append-only list of entries with a Merkle root that commits to all of them, in order. */
export class MerkleLog {
  readonly #leaves: Uint8Array[] = [];
  readonly #cache = new Map<string, Uint8Array>();
  readonly #hash: Hasher;

  constructor(hash: Hasher = sha256) {
    this.#hash = hash;
  }

  get size(): number {
    return this.#leaves.length;
  }

  /** Adds an entry at the end and returns its position. Entries are never changed or removed. */
  append(data: Uint8Array): number {
    this.#leaves.push(hashLeaf(data, this.#hash));
    return this.#leaves.length - 1;
  }

  /** Hash of the entry at a position, as hexadecimal text. */
  leafHash(index: number): string {
    const leaf = this.#leaves[index];
    if (!leaf) throw new RangeError("No entry at this position");
    return toHex(leaf);
  }

  /** All leaf hashes, in order, as hexadecimal text. */
  leafHashes(): string[] {
    return this.#leaves.map(toHex);
  }

  /** Root over the first `size` entries (all entries by default), as hexadecimal text. */
  root(size: number = this.size): string {
    this.#checkSize(size);
    return toHex(rangeRoot(this.#leaves, 0, size, this.#hash, this.#cache));
  }

  /** Proof that the entry at `index` is part of the tree of the first `size` entries. */
  inclusionProof(index: number, size: number = this.size): string[] {
    this.#checkSize(size);
    if (!Number.isInteger(index) || index < 0 || index >= size) throw new RangeError("No entry at this position in a tree of this size");
    return inclusionPath(this.#leaves, index, 0, size, this.#hash, this.#cache).map(toHex);
  }

  /** Proof that the tree of the first `first` entries is a prefix of the tree of the first `second` entries. */
  consistencyProof(first: number, second: number = this.size): string[] {
    this.#checkSize(second);
    if (!Number.isInteger(first) || first < 1 || first > second) throw new RangeError("The first size must be between 1 and the second size");
    if (first === second) return [];
    return consistencyPath(this.#leaves, first, 0, second, true, this.#hash, this.#cache).map(toHex);
  }

  #checkSize(size: number): void {
    if (!Number.isInteger(size) || size < 0 || size > this.size) throw new RangeError("Tree size out of range");
  }
}

export interface InclusionClaim {
  /** Hash of the entry (hexadecimal). */
  readonly leafHash: string;
  readonly index: number;
  readonly size: number;
  readonly path: readonly string[];
  readonly root: string;
}

/** Checks that an entry is in the tree with the given root. Needs nothing but the claim. */
export function verifyInclusion(claim: InclusionClaim, hash: Hasher = sha256): boolean {
  try {
    const { index, size } = claim;
    if (!Number.isInteger(index) || !Number.isInteger(size) || index < 0 || index >= size) return false;
    let fn = index;
    let sn = size - 1;
    let r = fromHex(claim.leafHash);
    for (const hex of claim.path) {
      if (sn === 0) return false;
      const p = fromHex(hex);
      if ((fn & 1) === 1 || fn === sn) {
        r = hashNode(p, r, hash);
        if ((fn & 1) === 0) {
          while ((fn & 1) === 0 && fn !== 0) { fn = Math.floor(fn / 2); sn = Math.floor(sn / 2); }
        }
      } else {
        r = hashNode(r, p, hash);
      }
      fn = Math.floor(fn / 2);
      sn = Math.floor(sn / 2);
    }
    return sn === 0 && equalBytes(r, fromHex(claim.root));
  } catch {
    return false;
  }
}

export interface TreeHead {
  readonly size: number;
  /** Root hash (hexadecimal). */
  readonly root: string;
}

/** Checks that the later tree contains the earlier one unchanged, followed by new entries. */
export function verifyConsistency(first: TreeHead, second: TreeHead, proof: readonly string[], hash: Hasher = sha256): boolean {
  try {
    if (!Number.isInteger(first.size) || !Number.isInteger(second.size) || first.size < 1 || first.size > second.size) return false;
    if (first.size === second.size) return proof.length === 0 && equalBytes(fromHex(first.root), fromHex(second.root));
    const path = proof.map(fromHex);
    if (isPowerOfTwo(first.size)) path.unshift(fromHex(first.root));
    if (path.length === 0) return false;
    let fn = first.size - 1;
    let sn = second.size - 1;
    while ((fn & 1) === 1) { fn = Math.floor(fn / 2); sn = Math.floor(sn / 2); }
    let fr = path[0] as Uint8Array;
    let sr = fr;
    for (const c of path.slice(1)) {
      if (sn === 0) return false;
      if ((fn & 1) === 1 || fn === sn) {
        fr = hashNode(c, fr, hash);
        sr = hashNode(c, sr, hash);
        if ((fn & 1) === 0) {
          while ((fn & 1) === 0 && fn !== 0) { fn = Math.floor(fn / 2); sn = Math.floor(sn / 2); }
        }
      } else {
        sr = hashNode(sr, c, hash);
      }
      fn = Math.floor(fn / 2);
      sn = Math.floor(sn / 2);
    }
    return sn === 0 && equalBytes(fr, fromHex(first.root)) && equalBytes(sr, fromHex(second.root));
  } catch {
    return false;
  }
}
