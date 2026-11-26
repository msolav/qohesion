# Threat model (draft)

Voting software for small organizations does not face nation-state adversaries. It faces a curious administrator, a disgruntled member, a stolen laptop, a phished email account and a misconfigured server. We design for those first and say plainly what we do not defend against.

## Assets

1. Integrity of results (nobody can add, remove or change ballots).
2. Eligibility (only entitled members vote, once per ballot).
3. Ballot secrecy, when the vote is configured as secret.
4. Members' personal information.
5. Availability during the voting window.

## Adversaries

| Adversary | Capabilities |
|---|---|
| Member | Own account, browser, can try to vote twice or as someone else |
| Account thief | Controls a member's email inbox |
| Org admin | Elevated role in the app, no server access |
| Server operator | Root on the VPS (often the same volunteer as the admin) |
| External attacker | Internet access, no credentials |

## Guarantees we aim to provide

- **One member, one vote**: enforced by a single-use voting credential issued at participation time.
- **Secrecy from admins**: for secret ballots, no admin role can link a member to a ballot through the application or its exports.
- **Verifiable tally**: each voter receives a receipt code, the published ballot list is checkable against the final count, and ballots are entries of an append-only Merkle ledger (`packages/ledger`, [ADR 0005](adr/0005-verification-formats.md)), so that a changed, dropped or reordered ballot is detectable by anyone who holds an earlier checkpoint.
- **Tamper-evident audit log** of administrative actions, including role changes and ballot configuration.

## Limits we state openly

- **The ledger proves consistency, not truth.** It shows that nothing recorded was changed afterwards, and that a voter's ballot is in the published list. It does not show that the ballot was encrypted honestly or that the tally is right (that is the role of the tally scheme, still to be chosen) and it only holds an operator to account for checkpoints that someone outside the server keeps. An operator who never published a checkpoint can still present a fresh ledger.
- **A malicious server operator with root access can defeat secrecy and integrity.** Self-hosting moves trust from a vendor to your own operator. Mitigations: hash-chained ballots, published receipts, and an optional end-to-end verifiable mode (tracked in issues). Organizations with high-stakes elections should use an independent scrutineer.
- **Coercion and vote selling** are not preventable in remote voting. Qohesion is meant for consultative and ordinary governance votes, not for contexts with a strong coercion risk. If your by-laws require in-person secret ballots for certain decisions, use them.
- **Email as identity** is only as strong as the member's mailbox. Optional second factor and in-person credential handover are planned.
- **Metadata** such as IP addresses is not stored with ballots, and server logs rotate on a short schedule. A network observer can still see that a client connected.

## Hosted edition

If the project operates a hosted service, the project operator becomes the "server operator" adversary for every organization on it. The design answer is in [ADR 0002](adr/0002-editions-hosting-and-trust.md): make integrity independent of the host (encrypted ballots, trustee-held keys, public ledger, independent verifier, anchored checkpoints), and say plainly what remains:

- **Secrecy depends on the voter's browser.** A hosted site serves the code that encrypts the ballot. A malicious host could serve a bad version. Signed, pinned bundles and challenge-audit reduce this but do not remove it.
- **Availability depends on the host.** A host can refuse service. Export and self-hosting are the exit.
- **Metadata** such as connection times is visible to the host and to its CDN.
- Organizations with high-stakes or contested elections should self-host or add an independent scrutineer.

## Out of scope

Compromised voter devices, nation-state adversaries, and legally binding public elections.
