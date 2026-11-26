import { sha256, toHex, type Hasher } from "./hash.js";

/**
 * A checkpoint states the size and root of the ledger at one moment. Published, sent to the organization's officers and
 * timestamped by an outside party, it makes a later rewrite of history detectable: the new ledger must prove consistency
 * with every checkpoint ever issued (see verifyConsistency).
 *
 * Text form (format version 1), one field per line, ending with a line feed:
 *   qohesion-checkpoint-v1
 *   <origin>            the poll the ledger belongs to
 *   <size>              number of entries
 *   <root>              root hash, lower-case hexadecimal
 */
export interface Checkpoint {
  readonly origin: string;
  readonly size: number;
  readonly root: string;
}

const HEADER = "qohesion-checkpoint-v1";

export function formatCheckpoint(c: Checkpoint): string {
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(c.origin)) throw new Error("Invalid origin");
  if (!Number.isInteger(c.size) || c.size < 0) throw new Error("Invalid size");
  if (!/^[0-9a-f]{64}$/.test(c.root)) throw new Error("Invalid root");
  return `${HEADER}\n${c.origin}\n${c.size}\n${c.root}\n`;
}

export function parseCheckpoint(text: string): Checkpoint | null {
  const lines = text.split("\n");
  if (lines.length !== 5 || lines[4] !== "" || lines[0] !== HEADER) return null;
  const [, origin, size, root] = lines;
  if (!origin || !size || !root || !/^(0|[1-9][0-9]{0,15})$/.test(size)) return null;
  const parsed = { origin, size: Number(size), root };
  try {
    return formatCheckpoint(parsed) === text ? parsed : null;
  } catch {
    return null;
  }
}

/** The value that is timestamped or signed: SHA-256 of the text form, in hexadecimal. */
export function checkpointDigest(c: Checkpoint, hash: Hasher = sha256): string {
  return toHex(hash(new TextEncoder().encode(formatCheckpoint(c))));
}
