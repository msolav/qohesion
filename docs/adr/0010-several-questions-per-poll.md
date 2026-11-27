# ADR 0010: Several questions per poll

- Status: proposed on 2026-11-27. Step 1 of the order of work is built (commit 4028828, with a block of 256 bytes instead of 512); nothing else is.
- Date: 2026-11-27
- Extends: [ADR 0007](0007-test-edition-and-results-visibility.md) (sealed ballots, closing rules, content in several languages), [ADR 0008](0008-verifiable-count-and-paged-voting.md) (section 8, more than one question; section 6, paged flow; section 3, recount), [ADR 0009](0009-organization-governance-and-approvals.md) (content digests)

## Context

ADR 0008 section 8 states that a poll holds an ordered list of questions, and leaves the storage change and the effect on closing rules open. A poll now has one question, stored in `polls.question`, `polls.kind` and `polls.options`, with translations in `polls.i18n`. A ballot is one `ballots` row, one ledger entry and one receipt.

Three facts of the current code shape the design.

1. **Sealed ballots leak their length.** `seal()` (`apps/web/src/lib/server/seal.ts:93-103`) encrypts the plaintext as is, and AES-GCM does not hide length. `castBallot` seals the bare option id (`service.ts:1256`). For a yes-no poll, `for` is 3 bytes and `against` or `abstain` is 7 bytes. In a custom poll, `o10` to `o12` are 3 bytes and `o1` to `o9` are 2 bytes. Anyone with read access to the database can tell these choices apart before the count. ADR 0007 section 1a states that nobody, the database included, can read a ballot before the count. With several answers per ballot the leak grows, so it is fixed first.
2. **The engine ignores unknown answers.** `validateForm` loops over the declared questions only. A request that carries extra answer keys passes validation. Once a ballot holds several answers, an unchecked key would enlarge the sealed plaintext.
3. **Approvals compare a digest of the draft.** `#pollContent` (`service.ts:520-528`) is a flat list of fields. Approvals are compared only for drafts (`service.ts:541, 574, 601`). A field that is added to the list for every poll changes every digest, and every pending or approved draft becomes stale on deploy.

## Decision

### 1. Data model

- `polls.questions TEXT` is a new nullable column, added with `addIfMissing` in `#migrate` (`service.ts:309-355`). No existing row is rewritten.
- A NULL `questions` value is read as a list of one, built from `question`, `kind` and `options`. Every poll that exists today, open or not, keeps working with its ballots.
- A question is `{id, type, prompt, options, config}`.
  - `id` is `q1` to `qn`, assigned at save and frozen when the poll opens, as option ids `o1..` are today (`#optionsOf`, `service.ts:808`).
  - `type` is `single` or `yes-no` in this ADR. Later kinds extend `type`.
  - `config` is an object, empty in this ADR. Later kinds add keys to it (minimum and maximum selections, scale bounds, maximum text length) and do not add columns.
  - `options` are `{id, label, icon, color}` as now. A yes-no question keeps the ids `for`, `against`, `abstain`.
  - Every question is required. A voter who wants to skip a question answers with an explicit option such as abstain. Optional questions are an open question.
- Limits: 20 questions, 12 options per question (the existing `MAX_OPTIONS`, `service.ts:284`), 100 options in total. `#validatePoll` (`service.ts:768`) enforces them with the error codes `questions_too_many` and `options_too_many_total`, and runs the existing option checks for each question.
- `Poll` gains `questions`. `poll.question`, `poll.kind` and `poll.options` stay as accessors on question 1, so code that has not moved keeps compiling. Step 3 lists every reader of these accessors and converts each one that counts or validates (`#count` at `service.ts:1184`, `Service.form` at 1215, `#totals` at 1284).
- **One writer.** A single function writes the question data of a poll, and `createPoll` (`service.ts:817`) and the update path (`service.ts:837`) both call it.
  - With one question it writes the legacy columns and sets `questions` to NULL.
  - With more than one it writes `questions`, and leaves the legacy `options` as an empty list. The legacy columns are not a mirror of question 1, so they cannot drift from `questions`.
  - An older build that reads such a poll finds a question with no options, and refuses every ballot on it. Step 3 verifies this by a test that runs the previous build's ballot validation against a multi-question poll.
- Translations (`poll-i18n.ts`) keep `title` and `description` at poll level. The texts of question 1 stay where they are. The texts of questions 2 to n go under `translations.questions[<question id>]`, with the same shape as the texts of question 1. They are keyed by question id and not by position, so removing or reordering a draft's questions cannot attach a text to another question. A poll with one question does not get a `questions` key. `missingTexts` (`poll-i18n.ts:52-60`) and `localize` run for each question. A poll that offers several languages and lacks any text of any question is refused, as in ADR 0007 section 4c.
- **Digest.** `#pollContent` adds a `questions` field (types, prompts, options and config) only when the poll has more than one question. The `translations` field already covers the added texts. A poll of one question keeps its current digest, so pending and approved drafts stay valid on deploy. The field set of ADR 0009 section 8 is otherwise unchanged. The approval "what changed" labels (`console.ts:586` and the French twin) get a label for `questions`.

### 2. One ballot, one entry, one receipt

- A ballot holds one answer for every question. It is one `ballots` row, one `entry` string, one leaf hash and one receipt, `receiptCode(hashLeaf(entry))`. The receipt identifies the whole ballot. No per-question receipt and no partial ballot exist.
- `ballots.entry` is never rewritten by a migration or by any later step. The receipt is the hash of the stored bytes (`service.ts:1262`), so rewriting an entry breaks the receipt of every ballot already cast.
- Entry formats:

| Poll | Readable | Sealed |
|---|---|---|
| One question | `{v:1, poll, seq, choice, nonce}` (unchanged) | `{v:1, poll, seq, sealed}` (unchanged shape; padded plaintext, section 3) |
| More than one question | `{v:2, poll, seq, answers:{q1:"o2", q2:"for"}, nonce}` | `{v:2, poll, seq, sealed}` |

- `ballots.choice` holds the bare option id for a poll of one question, and the canonical answers JSON (keys in question order) for a readable poll of several. For a sealed poll it is an empty string until the count, as now.
- `castBallot(token, answers)` replaces `castBallot(token, choice)`. `answers` is a record from question id to option id.
  - A string argument is read as `{q1: choice}` and is accepted only for a poll of one question, so existing callers and tests keep working.
  - The record used for validation is built from the poll's own question ids. A key that is not a question id of the poll is refused with `unknown_question` before `validateForm` runs. A value that is not a single string is refused for its question.
  - `Service.form` (`service.ts:1215-1226`) builds one engine step for each question, and the engine question id is the question id (`q1..qn`), not `choice`. An error is returned as `{error, question}` with the id of the question that failed.
- Changing a vote (`allowChange`) replaces the whole ballot. The voter sends every answer again, the `voter_tag` supersession (`service.ts:1250`) is unchanged, and each replacement has its own receipt. A sealed ballot cannot be prefilled for a returning voter, and the ballot says so.
- Cancelling is unchanged: `DELETE FROM ballots WHERE poll_id = ?` (`service.ts:1154`) erases all answers, because no other table holds answers. A test asserts this, so a later change that adds a derived table of answers fails it.

### 3. Sealing and counting

The key pair, the key shares, X25519, HKDF and AES-GCM do not change. Only the plaintext changes.

- **Fixed block.** Every new sealed ballot encrypts one block of 256 bytes: byte 0 is `0x00`, byte 1 is the payload length, then the payload, then zero bytes to 256. The payload is at most 254 bytes. The ciphertext length is therefore the same for every choice and every poll shape.
- **Payload.** For a poll of one question the payload is the bare option id, as the whole plaintext is today. For a poll of several questions it is the JSON `{"q1":"o2","q2":"for"}` in question order. The largest case allowed by the limits, 20 questions all answered `o12`, is 242 bytes, which fits. A larger kind (multiple selections, text) cannot use this block, and needs a larger block chosen from the poll's question types when it is built, so that the size depends on the poll and not on the answers (open question 2).
- **Overflow.** `seal` refuses to encrypt a payload that does not fit the block, and `castBallot` returns `ballot_too_large`. The limits make this unreachable for the kinds in this ADR. A test builds the largest allowed ballot and asserts that it fits.
- **Reading old and new ballots.** `#count` (`service.ts:1180`) opens each ballot. A plaintext that starts with `0x00` must be exactly 256 bytes and is read through its length prefix. Any other plaintext is a ballot cast before this change, whose bare option id was never padded, and is read as before. An option id never starts with `0x00`, so the two cannot be confused. The count is checked as follows.
  - A payload that starts with `{` is parsed as the answers of a poll of several questions. A payload that does not is a bare id, read as `{q1: id}` and valid only for a poll of one question.
  - The answers must have exactly the poll's question ids, and every answer must be an option id of its own question. Anything else returns `wrong_counting_key`, as an unreadable ballot does now.
  - The count stays all-or-nothing, and `superseded` and `keyMatches` work as now.
- **What the padding does not fix.** Sealed ballots cast before this change keep the length leak, because their ciphertexts cannot be rewritten (section 2). The ballot's rules page for a poll that was open at the upgrade does not change. The release note states which ballots are covered.
- **Recount.** ADR 0008 section 3 lets anyone open the ledger ciphertexts with the published key. The plaintext format above is the format a recount tool reads. Step 1 documents it with the verification formats of ADR 0005 and adds fixtures.

`#totals` (`service.ts:1282`) keeps `GROUP BY choice` for a poll of one question. For several questions it reads the non-superseded rows and sums them in JavaScript into one count table for each question. The roll is capped at `MAX_ROLL = 200` (`service.ts:283`), so this is cheap. Turnout counts members and not answers.

### 4. Closing rules and results

- `afterVotes` and `turnoutPercent` count members and apply unchanged. A ballot is complete or absent, so every question has the same number of ballots whenever the poll closes. Closing at any time closes every question.
- `threshold` is refused when the poll has more than one question, with the error `rules_need_one_question`. `ruleProblem` (`close-rules.ts:35`) takes the number of questions, and `#validatePoll` calls it from both `createPoll` and the update path, so a draft that already carries a threshold rule is also refused when a second question is added to it. `#closeIfRuleHolds` (`service.ts:1269`) passes `counts: null` when there is more than one question, as a second guard. Without this, `closeReason` would apply the threshold to question 1 only and say nothing.
- This answers the third open question of ADR 0008 for the first release: no "any question" rule. A later step may allow a threshold on one named question (section 7, step 7).
- `timing` and `audience` stay poll-wide. A release for each question would show partial results.
- `ResultsView` gains an additive field `questions: [{id, counts}]`. `counts` stays as the counts of question 1, so `/api/results/[pollId]` and open results pages keep working. For a poll of one question `questions` has one entry.
- A named poll's answers (`#answers`, `service.ts:1316`) return one answers object for each row.
- The published ballot list (`publication`, `service.ts:1333`) shows one line for each ballot, with its receipt and all its answers, in the order of the receipt codes like the ledger (the order of casting is not published).
  - A combination of answers can identify a voter in a small roll. A coercer can require a rare combination and look for it in the list. This is a limit of publishing the list, and the order of the list does not remove it.
  - The builder warns when `publishCount` is on and the product of the questions' option counts is at least the roll size. The warning is shown at review and again at opening, since the roll can change until then.

### 5. Builder

- The "question" step of `PollForm.svelte` (`STEPS`, line 87) becomes two steps: "poll" (title, description, languages) and "questions".
- "Questions" is an ordered list of cards. Each card has a type, a question text for each offered language and the existing option rows with icon, colour and reordering. Cards can be added, removed and reordered, up to the limit.
- Question 1 keeps its current field names. Questions 2 to n post prefixed fields (`q2_question_fr`, `q2_option_en`, `q2_option_icon`), and a `question_order` list gives the order. `parseOptionRows` (`poll-form.ts:24-48`) takes the prefix as an argument.
- The review step lists every question. Errors name the question. The translation-gap check (`gaps()`) and `missingTexts` run for each question. The threshold control is disabled, with the reason stated, when the poll has two or more questions.
- The `edit` route returns every question in its `input`, or editing a draft would lose the added questions.
- Without JavaScript, existing cards can be edited and new cards cannot be added.
- `preview/ballot` renders from the same components as the voter page.

### 6. Voter flow

The pages are those of ADR 0008 section 6, and that section is not amended: introduction, rules, one page for each question, summary (more than one question), confirmation (when a vote cannot be changed), receipt.

- When changes are allowed, the summary page is the page that submits the ballot, as there is no confirmation page then. When changes are not allowed, the summary leads to the confirmation page, which carries the final warning.
- The whole ballot is one `<form>` and one POST. Paging is client state. The fieldsets of all questions stay in the DOM and the fieldsets of other pages are hidden, as at `BallotView.svelte:168`, so one POST carries every answer.
- A new per-question component renders one question's fieldset, and the page loops over the questions. `chosen` becomes `answers: Record<questionId, string>` in the page. Radios use `name="a_<qid>"` and `id="a_<qid>_<optionId>"`. The current `name="choice"` and `id="c-{option.id}"` (`BallotView.svelte:174`) repeat across questions because option ids repeat, and radio groups and label clicks would cross between questions.
- The action in `v/[token]/+page.server.ts` reads exactly one value for each `a_<qid>`. Several values for one question are refused for that question and are no longer joined with a comma (lines 32-35). A page loaded before the upgrade posts `choice`, and that field is read as `a_q1` for a poll of one question.
- `canLeave` is checked for the question being left. "Next" is blocked until that question has an answer. The one-page form (`?view=all` and the no-script fallback) shows every question and refuses an incomplete ballot, naming the question.
- A server error returns `{error, question}`. The page moves to that question and puts focus on its fieldset.
- The summary lists each question with the chosen label and a "Change" button that returns to that question's page.
- The page keeps `answers` and the page index in `sessionStorage` under a key made from the poll id, so that a reload does not lose a long ballot. It is removed when the receipt is shown. The tab keeps unsent answers until the tab closes, and the rules page says so for sealed polls (open question 3).
- The receipt page keeps one code and adds one line: the receipt code identifies the whole ballot, which holds N answers, and does not reveal any of them.

## Consequences

- The padding closes an existing leak for new ballots. Old sealed ballots keep it.
- The plaintext that a recount tool reads has a new format, documented in step 1. Tools written against bare option ids must read the length prefix.
- A poll of one question is unchanged in its columns, its readable entries, its digest and its receipts. Its sealed entries keep their shape and carry a longer ciphertext.
- Question 1 stays in the old columns when the poll has one question, and moves to `questions` when the poll has more. The two shapes exist at the same time and are read through one accessor. The cost is two readers for a time and one writer.
- A rollback to a build from before step 1 is not guarded, because that build has no check. After the first poll with several questions exists, the deployment must not go below the build of step 1 (section 7). Builds from step 1 on refuse to start when the database holds a question set they do not know.
- Free-text answers, multiple selections and ranking will need a larger block (section 3) and are not allowed by this ADR. When a free-text question is added, it is refused with `timing` set to live, because free text can identify its author.
- The published list of a poll with several questions can identify a voter in a small roll. The builder warning is the only mitigation.

## Open questions

1. Whether a question can be optional, and whether a skipped question is stored as an explicit `null`. Every question is required in this ADR.
2. The block size for kinds that need more than 254 bytes, and whether the size is chosen from the question types when the poll opens.
3. Whether the `sessionStorage` mirror clears on leaving the page. Clearing on `pagehide` also clears on reload, which defeats the purpose of the mirror. A narrower rule would clear when the navigation is not a reload.
4. Whether a threshold on one named question (single or yes-no only) is wanted, and the wording of the rules page when it is.
5. Whether the combination warning should become a refusal above a roll size.

## Order of work

Each step ships alone and leaves the test edition working.

1. **Padded sealing and the rollback guard. No other change. Built: the padding in 4028828, the guard with the next commit.**
   - Add the 256-byte block with length prefix to `seal.ts` and the reading rule to `#count`. Add the startup check: the application refuses to start when `polls` has a `questions` column with a non-NULL value and this build does not know that column.
   - Tests: fixtures cut from real v1 sealed ballots, bare ids of 3 and 7 bytes and `o1..o12`. A poll that holds an old unpadded ballot and a new padded ballot counts both. Every new ciphertext has the same length whatever the choice. A tampered length prefix is refused.
   - Document the plaintext format with ADR 0005's verification formats.
   - Risk: a bad dispatch makes old sealed polls uncountable. The fixtures cover it.
2. **The `questions` column, read as a list of one. No UI.**
   - Add the column, `Poll.questions`, the single writer, the limits, translations by question id and the digest rule.
   - Tests: a golden digest of a current draft is equal before and after. The digest changes when an option of question 2 changes. The approval "what changed" label (`console.ts:586`) names `questions`. The previous build's validation refuses a poll of several questions. A draft with a threshold rule is refused when a question is added.
   - Risk: digest drift stales approvals. The golden test is the guard.
3. **Cast, count, totals, results, publication and the threshold refusal.** Test through service-level fixtures, with no UI.
   - `castBallot(answers)`, `Service.form` by question id, `unknown_question`, `{error, question}`, the v2 entries, `#count` for several questions, per-question `#totals`, `ResultsView.questions`, `#answers`, the published list, and the `rules_need_one_question` refusal and `counts: null` guard.
   - Tests: a crafted request with extra keys is refused. The largest ballot fits the block. Cancel erases every answer. A readable and a sealed poll of several questions count the same totals.
   - Risk: every consumer of the counts changes together. `counts` stays as question 1 to keep the shape additive.
4. **Voter flow.** The per-question component, `answers` state, summary page, prefixed radios, one-page form, error routing, `canLeave`, receipt line and the `sessionStorage` mirror.
   - Risk: focus order across hidden fieldsets, the no-script fallback and the shared preview.
5. **Builder.** The questions list, prefixed parsing, review step, edit round trip, live preview, threshold control disabled, and the combination warning.
   - Risk: the size of `PollForm.svelte` (592 lines), a bad field-name migration for old forms, and gaps in translations. This is the first step after which extra questions can exist, so the deployment note applies from here: no rollback below the build of step 1.
6. **Wording and ADR amendments.** English and French texts for the new errors, the rules page, the summary and the receipt line, and an edit of ADR 0008 section 8 that records the answer to its third open question.
7. **Optional, later: a threshold on one named question.** Add `threshold.question` as a read-time default of `q1`, never written into stored rules, so that digests do not change. It is limited to `single` and `yes-no` questions, and the rules sentence and the ballot's rules page name the question.