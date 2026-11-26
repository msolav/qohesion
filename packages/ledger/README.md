# @qohesion/ledger

The append-only ledger of a vote. Each recorded ballot (encrypted, whatever the scheme) is one entry. The ledger's root hash commits to every entry and their order, so that tampering is detectable by anyone who holds an earlier root. See [ADR 0002](../../docs/adr/0002-editions-hosting-and-trust.md), points 2 and 4.

- **Merkle log** (`merkle.ts`): the tree of [RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html), section 2, with SHA-256 (the construction of Certificate Transparency). Leaves and nodes are hashed with different prefixes.
- **Inclusion proof**: shows that an entry is in the tree with a given root, in a number of hashes that grows with the logarithm of the size. A voter uses it to check that the ballot is counted.
- **Consistency proof**: shows that a later tree contains an earlier one unchanged, followed by new entries. An auditor uses it to check that no earlier entry was changed, dropped or reordered between two checkpoints.
- **Receipt code** (`receipt.ts`): the first 60 bits of an entry's hash as `XXXX-XXXX-XXXX`, displayed to the voter. It finds the entry in the published list. The full hash and an inclusion proof do the checking.
- **Checkpoint** (`checkpoint.ts`): a fixed text form of (poll, size, root), and its digest, for timestamping by an outside party and for sending to the organization's officers.

## What this package does not do

- It does not encrypt ballots or count them. The encryption and tally scheme is a separate decision: [ADR 0002](../../docs/adr/0002-editions-hosting-and-trust.md) requires evaluating audited designs (Belenios, Helios, ElectionGuard) before any cryptography is written.
- It does not authenticate a tree size by itself. An inclusion or consistency proof ties entries to a root, but trees of the same shape give the same path, so the size and root are always read together from a checkpoint (one that is published, timestamped or signed), never from the proof. A test documents this.
- It does not sign or timestamp. A checkpoint gains its value once it is held by someone who does not depend on the server.
- Hashing uses `node:crypto`. A browser verifier supplies its own `Hasher`.

## Test vectors

The roots for trees of 0 to 8 entries match the published Certificate Transparency reference roots, and the proofs match a separate implementation of the RFC. The tests also check every entry of every tree size up to 40, and every pair of sizes up to 40.

```sh
npm ci
npm run typecheck
npm test
```
