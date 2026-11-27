# ADR 0007: Test edition and results visibility

- Status: proposed on 2026-11-26.
- Date: 2026-11-26
- Extends: [ADR 0003](0003-three-modes-one-engine.md) (modes, roles, roll), [ADR 0002](0002-editions-hosting-and-trust.md) (trust)

## Context

The project needs a version that people can use end to end (create a space, run a poll, vote, read the results) before the audited ballot encryption and count scheme is chosen. Two requirements arrive with it: results that every participant can follow in real time, and separate interfaces for the owner and the administrators.

Showing running results conflicts with the secret-ballot defaults of ADR 0003 (turnout hidden while voting runs). Both must exist. The organization decides, once, before the poll opens, and every voter sees the decision on the ballot screen.

## Decision

### 1. A test edition, labelled as such

- The test edition stores ballots in a local SQLite file. Encryption is **optional, chosen per poll before it opens, and stated on the ballot screen** (section 1a). It is for trying the product, not for decisions that need an audited secret ballot.
- Every screen shows a "Test edition" notice. The notice is a property of the build (`QOHESION_EDITION=test`), not of a page, and its text says that data may be erased and that the edition is not audited.
- Votes are still recorded in the real ledger (Merkle tree, receipt code), so the receipt and verification screens are the final ones.
- The ballot is stored apart from the voter: the table that records who voted holds no choice, and the table of ballots holds no voter. The link remains weak (timing, and anyone with database access), which is why the edition is not for secret decisions.
- No email is sent. Where the product sends a message, the test edition shows the link on screen instead, to the person who would receive it (an administrator copying personal links, or a member who asks for theirs).
- The edition is removed when the audited scheme replaces it (issue for ADR 0002's open question). Nothing in the data model depends on the missing encryption: the ballot column holds an opaque value that later holds a ciphertext.

### 1a. Sealed ballots (optional encryption)

- A poll is either **sealed** or **not encrypted**, chosen while it is a draft and locked when it opens. The ballot screen says which, in plain words, before the member chooses.
- A sealed poll gets a key pair when it opens. Each ballot is encrypted to the public key as soon as the server receives it (X25519, HKDF-SHA-256, AES-256-GCM, a new ephemeral key per ballot). The private half, the **counting key**, is shown once to the administrator and kept nowhere. Without it nobody, the administrators and the database included, can read a ballot.
- Closing a sealed poll needs the counting key. The server reads every ballot with it, in memory, records the totals, and does not keep the key. A wrong key changes nothing. A sealed poll that closes by itself at its set time waits, closed, until an administrator enters the key. A lost key means the ballots can never be counted, and the screen says so when the key is shown.
- Sealed ballots cannot show live totals, because nobody can read them before the count. Choosing live results turns encryption off, and the form says why.
- The ledger works the same way for both kinds. For a sealed poll the ledger entries are the ciphertexts.
- What this does not give: the server sees a choice for the instant it encrypts it, and at the count it reads them all. A single key holder is trusted. The audited scheme with a threshold key (ADR 0002) removes both limits. This is why the edition is still labelled a test.

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

Included: space creation, keys, poll creation with one single-choice question (in favour, against, abstention, or custom options), the roll with personal links, opening and closing, voting with receipt, optional sealed ballots with a counting key, results with the visibility settings, a ledger page, an optional password in front of the whole edition.

Not included: threshold keys and the audited scheme, email, domain verification, payment, several questions per poll, ranked choice.

## Consequences

- A test server can be put behind one shared password (`QOHESION_GATE_PASSWORD`), so it can be shown to chosen people.
- The pages send `Referrer-Policy: same-origin`. `no-referrer` makes browsers send `Origin: null` with a form post, which the framework's cross-site check refuses; `same-origin` still sends nothing to other sites, so personal voting links do not leak.
- The test edition can be run by anyone, locally or on a server, with `QOHESION_EDITION=test`. Without that variable the application refuses to enable these routes.
- Results visibility becomes part of what a voter agrees to, so it is shown in the poll's facts block on the ballot screen.
- The roll's and the ledger's packages are used as they are.
- The design of the administrator and owner screens is in DESIGN.md ("The Console").

## Open questions

- Whether `live` results must be refused below a minimum roll size rather than warned about.
- The first threshold for the warning (5 members) is a guess to revise with use.
- Whether the audience `anyone` needs a way to be closed after the poll ends.
