# @qohesion/roll

Logic for the member roll, with no framework and no storage. It decides what the interface and the server then apply. See [ADR 0003](../../docs/adr/0003-three-modes-one-engine.md), sections 4, 6 and 8.

- **Addresses** (`address.ts`): syntax check for plain addresses, canonical form (Gmail dots and `+tags`, provider aliases), a suggested correction for a mistyped common domain, a list of disposable domains.
- **Domain mail check** (`domain.ts`, `dns.ts`): does a domain accept mail? MX records, the null MX of RFC 7505, the address-record fallback, a missing domain, and temporary failures reported as such so that a valid address is not turned away. The lookup is injected; `nodeMailResolver` is the server's real one.
- **Fingerprints** (`fingerprint.ts`): keyed HMAC-SHA-256 of the canonical address, so that lists of different organizations can be compared without keeping addresses. Overlap measures and a test for "probably the same group" that ignores small overlaps.
- **Status** (`status.ts`): the states of one address (listed, requested, confirmed, voted, withdrawn, bounced, blocked), the phases (registration, frozen, voting, closed) and the events that move between them. Invalid moves return a reason instead of throwing.
- **Roll** (`roll.ts`): the frozen roll as a count and a short code that depends on the exact list and not on its order; amendments with their author, time and approvals; the roll after approved amendments, with those made during voting marked as late.
- **Assurance** (`assurance.ts`): checks the number of administrators and the threshold needed to open the count, warns about weak setups (1 of 1, 1 of 2, 2 of 2, all needed), and gives the assurance level (informal, formal, reinforced) with what is missing for the next one.

The roll code format is part of the verification format (version 1) and is pinned by a test.

```sh
npm ci
npm run typecheck
npm test
```
