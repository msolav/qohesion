# ADR 0005: Verification formats, version 1

- Status: proposed
- Date: 2026-11-26
- Extends: [ADR 0003](0003-three-modes-one-engine.md) (roll and registration), [ADR 0004](0004-versioning-and-updates.md) (data formats are versioned separately)

## Context

Several short codes and hashes are shown to people and compared later: the code of the frozen roll, the receipt of a ballot, the checkpoint of the ledger. An independent verifier must be able to recompute them years later, so their exact construction is part of the data format and must not change silently. This record fixes version 1 of those constructions as implemented in `packages/roll` and `packages/ledger`.

## Decision (proposed)

### 1. Address fingerprint

`HMAC-SHA-256(key, canonical address)`, written as base64url, first 32 characters. The canonical address is lower-case, with `+tag` removed for providers that ignore it, dots removed for Gmail, and known provider aliases merged (`googlemail.com` to `gmail.com`, `protonmail.com` and `pm.me` to `proton.me`). Other domains are left unchanged. The key is at least 16 bytes and is held by the service, never published. Fingerprints are compared across organizations only to detect overlapping lists (ADR 0003, section 8). Within one poll, the roll code is computed over fingerprints made with a key specific to that poll, so that a published roll code cannot be matched against other polls. *The per-poll key is not yet implemented.*

### 2. Roll code

SHA-256 over `qohesion-roll-v1\n` followed by each fingerprint, sorted and without duplicates, each followed by `\n`. The first 60 bits are written in Crockford base32 as `XXXX-XXXX-XXXX`. The order of the list does not matter, and any change to the list changes the code. A fingerprint must be non-empty base64url text. Golden values are pinned in the tests (the empty roll gives `CKWY-NFZW-ZN0Y`).

### 3. Ledger

The Merkle tree of [RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html), section 2, with SHA-256: empty tree `SHA-256("")`, leaf `SHA-256(0x00 || entry)`, node `SHA-256(0x01 || left || right)`. The entry is the encrypted ballot as stored. The tree supports inclusion proofs (a ballot is counted) and consistency proofs (a later ledger extends an earlier one unchanged).

### 4. Receipt code

The first 60 bits of the entry's leaf hash in Crockford base32, `XXXX-XXXX-XXXX`. The code locates the entry in the published list. The full leaf hash with an inclusion proof is what verifies. With 60 bits, the chance that two entries in a poll of 10,000 ballots share a code is about one in 23 billion; a collision is resolved by the full hash.

### 5. Checkpoint

Text, one field per line, ending with a line feed: `qohesion-checkpoint-v1`, the poll identifier, the size, the root in lower-case hexadecimal. The value that is timestamped or signed is the SHA-256 of that text. The size and the root are bound together by the checkpoint, not by any proof: inclusion and consistency proofs do not authenticate the size.

### 6. Versions

Each construction carries its version in its input (`qohesion-roll-v1`, `qohesion-checkpoint-v1`). A change creates a new version identifier. The verifier supports every past version (ADR 0004, section 5).

## Consequences

- A verifier can be written in any language from this record and the RFC, and checked against the pinned values.
- The ledger and the tally scheme are independent: the ledger stores whatever the encryption scheme produces. The encryption and tally scheme remains to be chosen among audited designs (ADR 0002).
- The receipt code is short for people. It is a lookup key, never a proof by itself.

## Open questions

The per-poll fingerprint key and where it is kept. Whether to sign checkpoints with the administrators' keys in addition to timestamping them (OpenTimestamps or RFC 3161). The encoding of entries when the tally scheme is chosen. A browser implementation of the hash function for voters who verify in the browser.
