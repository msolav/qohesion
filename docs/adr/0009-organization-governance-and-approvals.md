# ADR 0009: Organization governance and approvals

- Status: proposed on 2026-11-27.
- Date: 2026-11-27
- Extends: [ADR 0003](0003-three-modes-one-engine.md) (roles, roll), [ADR 0007](0007-test-edition-and-results-visibility.md) (keys, settings fixed at opening), [ADR 0008](0008-verifiable-count-and-paged-voting.md) (verifiable count)
- Related issues: #74 (owners and administrators), #62 (registration phase and co-signing), #63 (roll amendments, co-approved)

## Context

An organization with several administrators should not depend on any one of them. Today any administrator can open a poll, change the organization's name, add or revoke keys and cancel a vote alone. For a tool whose purpose is a count that others can trust, that is the weakest point left: the cryptography can be sound while one person changes what is being voted on.

The owner's decisions, recorded here in the order they were made:

1. Drafts stay free to edit. Publishing a poll, including its list of participants and the emails that go with it, goes through approval. Any change to a draft resets its approval state and warns about the change until publication.
2. The approval rule is a setting of the organization.
3. The owner sets up the basics. Once the rule is on, it can only be removed with the administrators' agreement. Administrators can check the organization's setup details against their records.
4. With two administrators both are expected to be active, so both must agree. The organization can, if it turns the feature on, let its members instate a new administrator.
5. The organization's data should be protected so that it is also incorruptible, as far as that is possible.
6. The time allowed for an approval is a setting, not a fixed number. The organization also chooses what an abstention means.
7. Voters are shown how a poll was approved. This transparency is central.

## Decision

### 1. The approval rule

A setting of the organization, with three values:

| Rule | A request is approved when |
|---|---|
| `none` | Always. This is the default, and the only value that makes sense with one administrator. |
| `majority` | More than half of the eligible administrators approve. |
| `all` | Every eligible administrator approves. |

Eligible administrators are the keys with the administrator role that are not revoked when the request is made. A request made by an administrator counts as that administrator's approval.

Whatever the rule, with two or more administrators a request is never approved by its proposer alone: at least two distinct administrators must approve.

With a single administrator no approval is possible, so the rule has no effect. It still counts as on, and starts to apply as soon as a second administrator exists. The ballot states the rule and how many administrators there are (section 8).

### 2. The rule is a ratchet

The owner sets the rule while setting up the organization. Once it is on, changing it, including turning it off, changing what an abstention means or lengthening or shortening the delay, is itself a request that needs approval under the rule in force. One administrator cannot lower the bar to act alone.

### 3. What needs approval

Drafts are working material. Any administrator can create and edit them.

| Action | Approval |
|---|---|
| Open a poll now, or schedule it. This publishes its settings, its questions, its list of participants and the emails to send. | Required |
| Add participants after opening, where the poll allows it. Each batch is one request. | Required |
| Cancel a poll, or close it before its deadline. | Required |
| Organization settings: name, time zone, language, approval rule and its parameters. | Required |
| Add or revoke a key. Transfer ownership. Delete the organization. | Required |
| Send a reminder to participants already on an approved list. | Not required |
| Edit a draft. Read results the poll's settings allow. | Not required |

Closing a poll at its deadline, or by a rule fixed before opening, needs no approval: the approval of the opening already covered it.

### 4. Approval applies to an exact version

A request carries a digest (SHA-256 over a canonical form) of what is being approved. For a poll that is its settings, its texts in every language, its options, the fingerprints of its roll, and the emails to send. An approval is valid only for the digest it was given for.

- Any change to a draft changes its digest, clears the approvals collected so far, and the console says so: what changed, who changed it, and that approval starts again.
- This holds until publication. After that nothing in the poll can change (ADR 0007).
- A request cannot be approved from a stale view: the approver is shown the digest and the content it covers, and the approval fails if the draft changed in between.

### 5. Abstention

The organization chooses what an abstention means. The four values and their effect on a request, with N the number of eligible administrators, A the approvals and R the rejections:

| Abstention is | Effect |
|---|---|
| `agreement` | Counted as an approval. |
| `disagreement` | Counted as a rejection. |
| `neutral` | Counts as having answered, adds nothing to A or R, and stays in N. It does not block a request but does not help it. |
| `discarded` | The administrator is left out of N for this request, as if they had not been eligible. |

A request is approved when its rule holds with these counts and the two-person minimum of section 1 is met. It is rejected as soon as the rule can no longer hold even if every pending administrator approves. Otherwise it stays pending until its delay ends.

Example, three administrators, rule `majority`, two abstain and one approves: `agreement` approves it (3 of 3), `neutral` leaves it pending (1 of 3), `discarded` leaves one voter and fails the two-person minimum, `disagreement` rejects it (2 against).

The default is `neutral`.

### 6. The delay

How long a request stays open is a setting of the organization, from one hour to 90 days, 7 days by default. A request that reaches its delay without being approved lapses. It changes nothing and is kept in the history. A scheduled opening that is not approved by its opening time does not happen: the poll stays a draft and the console says why.

### 7. The setup record and its checks

An organization has a setup record: its name, time zone, language, the approval rule with its parameters, and the list of administrators with their labels.

- The owner creates it.
- Each administrator can confirm it ("these details match our records"). A confirmation names the digest of the record it was given for and is cleared when the record changes.
- The console shows who has confirmed and who has not. The ballot states how many administrators confirmed the current record.

### 8. What voters see

The rules page of a ballot, and the verification information of a published poll, state:

- the approval rule in force and the number of administrators;
- that the poll was published with the approval of A of N administrators, and when;
- the digest that was approved, so that it can be compared with what a participant received;
- how many administrators confirmed the organization's setup record.

Voters see counts. The console shows the labels of the keys that approved. Whether an organization may choose to show the labels too is an open question.

### 9. The organization's name is fixed while a poll is active

The name cannot change while any poll is scheduled or open. Each poll keeps the name the organization had when the poll was published, and shows that name on its ballot, emails and results. A rename never rewrites the record of a poll that ran under another name.

### 10. A tamper-evident record

Every request, approval, rejection and applied change is an entry in an append-only record of the organization, built on the same Merkle tree as the poll ledger (`packages/ledger`). Each administrator can download the record and a checkpoint (tree size and root). Anyone holding an earlier checkpoint detects a record that was rewritten or cut.

A second step, not part of the first build, has each administrator sign their approval with a key pair derived from their key in the browser, so that the server cannot forge an approval. Until then the server records approvals on the word of a signed-in session, and the interface says so.

### 11. What protection can and cannot give

The owner asked whether the organization's data can be made incorruptible by encrypting it. Encryption keeps data secret. It does not stop it being deleted or replaced, and whoever runs the server can also serve modified code.

What can be built:

- Tamper evidence (section 10), so that a change by the server operator is detected by the administrators and by anyone holding a checkpoint.
- Encryption of the organization's private data (rolls, settings) under a key that administrators hold in shares, as ballots already can (ADR 0008), so that the operator cannot read it. This is a separate piece of work and an open question here.
- Published checkpoints, so that the record cannot be quietly rewound.

What cannot be promised: that a hostile operator cannot refuse service, delete everything, or ship modified code. Self-hosting moves that trust to the organization itself. The audited scheme of ADR 0002 and reproducible builds narrow the gap further.

### 12. Members can instate an administrator

An optional feature of the organization, off by default. When on, the organization's members, the people on its member register, can approve a new administrator by a vote of their own, under the same kind of rule. It needs a standing member register, which does not exist yet (rolls are per poll today). It is specified here and built later.

### 13. Order of work

1. The organization's name fixed while a poll is active, and kept per poll (section 9).
2. The approval engine: rule, abstention, delay, requests, the decision function, with tests (sections 1, 2, 5, 6).
3. Publication of a poll through approval, with digests, resets and warnings (sections 3 and 4).
4. Organization settings, keys and post-publication actions through approval (section 3).
5. What voters see (section 8) and the setup record with confirmations (section 7).
6. The tamper-evident record (section 10).
7. Signed approvals, encryption at rest, members instating an administrator (sections 10 to 12).

## Consequences

- With one administrator nothing changes for the user, except that the ballot says so.
- A group with two administrators needs both of them to publish anything. That is intended. If one of the two loses their key, the other cannot act alone, because of the two-person minimum. Recovery from a lost key is an open question below, and the interface warns about it when a second administrator is added.
- Polls store the organization's name, a digest, and the record of who approved. The ballot page and the published information read from them.
- The decision function is pure and tested without a database, so the rules of sections 1, 5 and 6 are checked case by case.

## Open questions

- Recovery when one of two administrators loses their key. A recovery key held offline by the owner is one candidate.
- Whether organizations may show the labels of approvers to voters.
- Whether strengthening the rule (for example `majority` to `all`) should need approval, or only weakening.
- The scope of encryption at rest and whose key opens it.
- Whether a request can be withdrawn by its proposer before the delay ends.
