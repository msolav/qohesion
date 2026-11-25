# ADR 0002: Editions, hosting and the trust model

- Status: proposed
- Date: 2026-11-25

## Context

Qohesion is meant to be installed by any organization on its own server. Many organizations cannot run a server, so a project-operated hosted service is also wanted, in the spirit of Wikipedia: free software, a free or low-cost hosted instance that pays for its own infrastructure, and the option to leave and host it yourself.

A hosted service puts the project operator in the position the threat model warns about: someone with root access to the machine that holds the votes. The hard requirement is that the result of a vote cannot be silently altered, by anyone, including us.

## Decision (proposed)

### One codebase, two ways to run it

1. **Self-hosted.** Free, any server, the organization controls where the data lives.
2. **Project-hosted.** Operated by the project, free within published limits, then a small fee that covers hosting and support. It runs the same released image as everyone else.

There is no open-core split and no feature behind a paywall. The licence stays AGPL-3.0. A fee buys hosting and support, never features. Any organization can export everything from the hosted service and import it into its own server, and the reverse.

### Integrity must not depend on trusting the host

Hosted or not, the design goal is that a malicious or compromised operator cannot change a result without being caught. The target claim is **tamper-evident and publicly verifiable**, not "incorruptible": no voting system can honestly promise the second.

Proposed mechanisms, each tracked as an issue:

1. **End-to-end verifiable tally.** Ballots are encrypted in the voter's browser. The decryption key is split among the organization's trustees (threshold scheme), so the host never holds it. The tally is computed with published proofs. Evaluate existing, audited designs before writing any cryptography: Belenios, Helios, ElectionGuard. Do not invent a scheme.
2. **Public bulletin board with receipts.** Every encrypted ballot is appended to a hash-chained public ledger, and the voter keeps a receipt that lets them check their ballot is included.
3. **Independent verifier.** A small standalone open-source tool that re-checks an election transcript without trusting our server or our code.
4. **Anchored checkpoints.** Ledger hashes are timestamped by an outside party (RFC 3161 or OpenTimestamps) and sent to the organization's officers, so history cannot be silently rewritten.
5. **Software supply chain.** Reproducible builds, signed releases, a software bill of materials, pinned dependencies, two-person review on integrity-critical code, an independent audit before 1.0.
6. **Client-code integrity.** A hosted site serves the code that encrypts your ballot, so a malicious host could serve a bad version. Mitigations: a signed, pinned, versioned bundle with published hashes, a way for voters to challenge-audit their ballot, and a clear statement that organizations with high-stakes elections should self-host or use an independent scrutineer.
7. **Operator limits.** Hosted operators have no technical means to read ballots or hold decryption keys. Every operator action on production is logged to the public ledger, with a two-person rule for access.

### Hosting platform

Keep ADR 0001's stack (Node and PostgreSQL in Docker). It runs on any VPS. Cloudflare in front for DNS, CDN, WAF and bot protection is fine. Moving the application onto Workers and D1 would fork the runtime and split the code; defer that unless limits force it. The migration path, export and import between hosted and self-hosted, is what makes starting small safe.

### Organization and money

The hosted service should be run by a non-profit legal entity, not an individual, before it holds other organizations' member data. Transparent budget, no ads, no tracking, no sale of data. Income: fees, donations, grants, sponsorship. The entity holds the name and trademark; the code remains AGPL.

## Privacy and legal consequences of hosting

Running the hosted edition makes the project a **service provider** for each organization, which stays the controller.
- A written agreement with each organization is needed (Law 25 rules on mandates to service providers; GDPR Art. 28 processor terms). **[verify]**
- Data leaving Quebec requires an assessment before transfer (Law 25 s. 17), and the hosting region must be chosen and disclosed. Cloudflare and any host become sub-processors. **[verify]**
- Incident handling, retention and erasure duties in `docs/privacy.md` apply to the project as processor.
- Whether an electronic vote is valid for a given decision depends on the organization's by-laws and governing statute, not on where it is hosted.

## Consequences

- Verifiable tallying is a core requirement, not a later hardening step. It shapes the data model, so it must be decided before the ballot engine is built.
- It costs complexity: key ceremonies for trustees, proofs, a verifier. Simpler ballot types may ship first with an honest statement of what is and is not verifiable.
- The hosted edition should not launch before the legal entity, processor agreement and integrity layer exist. A pilot with a few friendly organizations, with limits, comes first.

## Open questions

Which verifiable scheme fits secret ballots, ranked choice and multi-seat elections together. Whether trustees can be non-technical volunteers. The free-tier limits and the point at which an organization is asked to pay or migrate. The legal form of the entity.
