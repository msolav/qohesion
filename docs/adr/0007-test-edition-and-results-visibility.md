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

### 4a. Options can carry an icon and a colour

An option of a poll may have an icon and a colour, chosen from short fixed lists (16 icons, 7 colours) so that every combination stays legible in every template. Both are stored on the option, optional, and refused when not on the list. A poll's `kind` and its `options` are stored as data (not as a form of a fixed shape), so further kinds (multiple choice, ranking, scales, text) can be added later by extending the kind and the option fields, without changing the roll, the ballots or the ledger.

### 4b. Dates, closing rules and changing a vote

- **One organization per installation.** An installation holds one organization. Its front door is not a page about the product: the first visit sets the organization up, and later visits go to the sign-in of its administrators. Members arrive with their personal link. The hosted service, which holds many organizations, comes later.
- **Dates.** Every poll has a closing date and time, and may have an opening date and time. They are typed and shown in the time zone of the organization and stored as instants. Administrators can always open or close earlier. A poll with an opening date is **scheduled**: a sealed poll shows its counting key at scheduling, since nobody is present at the moment of opening, and the roll is frozen when the poll opens.
- **Closing rules.** Besides the deadline, a poll can close by itself after a number of votes, at a share of the roll that has voted (100 means everyone), or when an option has more than half of the roll or a chosen share of it. Any one that holds closes the poll. A threshold needs readable totals, so it is refused with sealed ballots. The rules are fixed when the poll opens and are stated on the ballot.
- **Changing a vote.** A poll can let members vote again until it closes, and the last ballot counts. This needs sealed ballots: a vote that can be replaced is tied to its voter by a pseudonym (a keyed hash of the poll and the roll entry), which shows who voted and never what. Earlier ballots stay in the ledger and are left out of the count. Turnout counts members, not ballots.
- **What this edition does not do.** A personal link is the proof of the address: whoever holds it can vote once. This is the informal, one-step level of ADR 0003 (section 4). The formal levels (a confirmation by a code sent to the address, a registration phase, a roll co-signed by several administrators, threshold keys) are not built, and the ballot says that anyone with the link can vote.

### 4c. Content in several languages

A poll offers one or more languages (French, English), the first being the default. The question, the details and each option are written in every language offered, and a poll that lacks one of them is refused, so a member never meets an empty question. The columns `title`, `description` and `options` keep the default language; the other texts sit in a JSON column. A member reads the poll in the language of the screen when it is offered, and in the default language otherwise, text by text.

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
