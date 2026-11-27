# ADR 0008: Verifiable count, presets, and the paged voting flow

- Status: proposed on 2026-11-27.
- Date: 2026-11-27
- Extends: [ADR 0007](0007-test-edition-and-results-visibility.md)

## Context

Two questions came out of use of the test edition.

1. When ballots are not encrypted, who gets the results, and what stops an administrator from changing them? The same question applies to an encrypted poll: the administrator who holds the counting key states the totals.
2. The ballot is one screen. A poll with several questions, a rules page to acknowledge, a summary and a deadline reminder needs a flow made of pages.

## Decision

### 1. Results are published by the system, not by an administrator

At the close, the system itself shows the final results to the audience chosen before opening. No administrator action is needed or possible: an administrator can close or cancel a poll, and cannot edit, hide or hand-write a result. A poll's results are computed from its ballots by the server and shown to the audience as soon as the poll is closed (and counted, for a sealed poll).

### 2. Cancelling is visible

A cancelled poll shows, to everyone who may see the poll, that it was cancelled, when, by which key, and how many ballots had been cast. The ballots are erased. This keeps cancelling from being used to bury a result without a trace. A preset can forbid cancelling once voting has started.

### 3. A count that anyone can check

A participant can check that their ballot is in the ledger (receipt code, inclusion proof). To check the total as well, anyone must be able to recount. After a poll closes and is counted, a poll can **publish its ballot list**: one line per ballot, with its receipt code and its choice. Each participant finds their own line, and anyone can add the lines up. For a sealed poll, the **counting key is published too**, so that anyone can decrypt the ciphertexts in the ledger and see that the listed choices are the ones that were sealed. Publishing the key does not link a choice to a person: ballots stay unnamed in a secret poll. In a named poll the list shows addresses, as announced on the ballot.

### 4. Presets

Three presets fill the settings in one choice, and each setting can still be changed afterwards. The ballot states the result.

| Preset | Ballots | Who answers | Results | Verification |
|---|---|---|---|---|
| **Secret ballot** (default) | encrypted until the count | anonymous | participants, at the close | receipts and ledger |
| **Maximum transparency** | encrypted until the count | anonymous | everyone, at the close | receipts, ledger, ballot list and counting key published, cancelling forbidden once voting has started |
| **Open vote** | readable | named | participants, live | the list of answers is the result |

### 5. Counting key held by several administrators

A counting key can be split between the administrators (k of n), so that opening the ballots needs k of them. Each administrator receives one share. At opening, the server cuts the key in memory and hands out the shares once; it keeps none. With one administrator this adds nothing, so the setting is offered when at least two administrator keys exist. The dealer problem remains: the server briefly holds the whole key when it cuts it. The audited scheme of ADR 0002 removes it.

### 6. The paged voting flow

A voter goes through pages, and an administrator can choose the one-page form for a simple poll.

1. **Introduction:** the title and the description of the poll.
2. **Rules:** how the poll works (who sees what, anonymity, encryption, whether a vote can be changed, how the poll ends: the deadline and any closing rule) and a statement the voter agrees to before continuing.
3. **Questions:** one page for each question. A poll with one question is completed on that page.
4. **Summary** (more than one question): all answers, each with a link back to change it.
5. **Confirmation:** when a vote cannot be changed afterwards, a final warning before it is submitted.
6. **Receipt:** the receipt code, the date the poll closes, and a reminder.

The deadline, or the terms of completion when there is none, appear on the rules page, on the ballot, and on the receipt page.

### 7. Reminders for the voter

On the receipt page, and on the rules page before voting, a participant can download an **.ics file** (a calendar event at the closing time, with an alarm 24 hours before) or add the same event to their calendar. This needs no email address and sends nothing.

### 8. More than one question

A poll holds an ordered list of questions, each with a type (single choice today; later multiple choice, ranking, rating each option, scale, free text, and images on options). Ballots hold one answer for each question. Closing rules that read totals (a threshold) apply to polls with one question of a counting type. The storage change is a `questions` list in place of the single `question`, `kind` and `options`, with the current poll read as a list of one.

### 9. Email confirmation

A poll can require each participant to confirm their address with a code sent to it before voting. Without it, anyone who holds a personal link can vote once, and the ballot says so. Confirmation needs email to be set up on the server.

## Consequences

- The result of a poll cannot be edited by an administrator, and the means to prove it are published rather than promised.
- The voting flow becomes a sequence of pages, which touches the ballot templates (each page needs the same look) and the data model (several questions). It is built in steps: presets and publication of the count first, then the pages, then several questions.
- Publishing the counting key ends the secrecy of sealed ballots after the count. This is the intended effect of the maximum-transparency preset, and it is stated on the ballot.

## Open questions

- Whether the maximum-transparency preset should also publish the roll, and to whom.
- The text participants agree to on the rules page, and whether an acknowledgement is stored (a counter, or nothing).
- Whether closing rules that read totals can apply to several questions (for example, any question).
