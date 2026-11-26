# ADR 0007: Test edition and results visibility

- Status: proposed on 2026-11-26.
- Date: 2026-11-26
- Extends: [ADR 0003](0003-three-modes-one-engine.md) (modes, roles, roll), [ADR 0002](0002-editions-hosting-and-trust.md) (trust)

## Context

The project needs a version that people can use end to end (create a space, run a poll, vote, read the results) before the audited ballot encryption and count scheme is chosen. Two requirements arrive with it: results that every participant can follow in real time, and separate interfaces for the owner and the administrators.

Showing running results conflicts with the secret-ballot defaults of ADR 0003 (turnout hidden while voting runs). Both must exist. The organization decides, once, before the poll opens, and every voter sees the decision on the ballot screen.

## Decision

### 1. A test edition, labelled as such

- The test edition stores ballots **without encryption**, in a local SQLite file. It is for trying the product, not for decisions that need secrecy or an audit.
- Every screen shows a "Test edition" notice. The notice is a property of the build (`QOHESION_EDITION=test`), not of a page, and its text says that ballots are not encrypted and that data may be erased.
- Votes are still recorded in the real ledger (Merkle tree, receipt code), so the receipt and verification screens are the final ones.
- The ballot is stored apart from the voter: the table that records who voted holds no choice, and the table of ballots holds no voter. The link remains weak (timing, and anyone with database access), which is why the edition is not for secret decisions.
- No email is sent. Where the product sends a message, the test edition shows the link on screen instead, to the person who would receive it (an administrator copying personal links, or a member who asks for theirs).
- The edition is removed when the audited scheme replaces it (issue for ADR 0002's open question). Nothing in the data model depends on the missing encryption: the ballot column holds an opaque value that later holds a ciphertext.

### 2. Results visibility is a poll setting, fixed at opening

Two independent settings, chosen while the poll is a draft and locked when it opens:

| Setting | Values | Meaning |
|---|---|---|
| **Timing** | `close` (default), `live` | Whether totals are shown while voting runs, or only after the poll closes. |
| **Audience** | `administrators`, `voters` (default), `anyone` | Who may see the results: the poll's administrators; members on the roll; anyone with the results address. |

Rules:
- With timing `close`, nobody sees totals before the close, administrators included. Turnout (a count of ballots cast) stays visible to administrators only. Members see turnout only when the audience allows and the timing is `live`.
- With timing `live`, the audience sees totals and turnout as ballots arrive. The ballot screen states this before the voter chooses, in the functional register.
- After the close, every audience sees the final totals and the ledger information.
- A voter's own choice is never shown with their name. Live totals with a small roll can still reveal a choice (a roll of three where two votes are in). The administrator form warns when live results are chosen for a roll below a threshold (5 members).
- Settings cannot be changed after opening. A change needs a new poll.

### 3. Roles with keys

- A person holds a **key**. A key carries one or both roles (`owner`, `administrator`). The person who creates a space receives one key with both roles, and the owner may create more keys with either role.
- Roles follow ADR 0003: an owner manages the space (name, language, keys, deletion); an administrator performs ballot duties (polls, roll, results). Holding both is a choice of the organization, visible on the keys page.
- A key is shown once, when created. Only a hash is stored. Signing in means entering the key; a session cookie then holds a random session token (hashed in storage).
- A key can be revoked by an owner at any time, and the last owner key cannot be revoked.

### 4. Real-time results

Results update by polling a JSON address every few seconds while the page is visible and the poll is open. The address applies the rules of section 2 on every request. It carries no identifier. A push channel replaces polling later if the load calls for it; the rules stay the same.

### 5. Scope of the first test

Included: space creation, keys, poll creation with one single-choice question (in favour, against, abstention, or custom options), the roll with personal links, opening and closing, voting with receipt, results with the visibility settings, a ledger page.

Not included: encryption and threshold keys, email, domain verification, payment, several questions per poll, ranked choice.

## Consequences

- The test edition can be run by anyone, locally or on a server, with `QOHESION_EDITION=test`. Without that variable the application refuses to enable these routes.
- Results visibility becomes part of what a voter agrees to, so it is shown in the poll's facts block on the ballot screen.
- The roll's and the ledger's packages are used as they are.
- The design of the administrator and owner screens is in DESIGN.md ("The Console").

## Open questions

- Whether `live` results must be refused below a minimum roll size rather than warned about.
- The first threshold for the warning (5 members) is a guess to revise with use.
- Whether the audience `anyone` needs a way to be closed after the poll ends.
