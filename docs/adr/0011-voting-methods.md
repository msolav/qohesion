# ADR 0011: Voting methods and polling modes

- Status: proposed on 2026-11-27. Step 1 is built in the test edition: the catalogue below as data, a public page that describes each method and its state, and a short description of the method on the builder and on the ballot. No new counting method is built yet.
- Date: 2026-11-27
- Extends: [ADR 0003](0003-three-modes-one-engine.md) (modes), [ADR 0008](0008-verifiable-count-and-paged-voting.md) (verifiable count), [ADR 0010](0010-several-questions-per-poll.md) (question types and `config`)

## Context

A poll today has two question types: yes, no or abstain, and one choice among several. Both are counted the same way, by plurality: the answer with the most ballots leads. Closing rules (quorum, threshold) are set on top of that count.

The owner wants Qohesion to offer the methods studied in voting theory and used in political and opinion polling: first past the post, two rounds, grading and others. Each method is a different ballot shape and a different count. A method also changes what can be published, since some ballots identify their voter when shown one by one.

This ADR lists the methods in scope, says which parts of the engine each one touches, and sets the order of work. It also fixes how a method is described to voters, so that the same text appears when the poll is built, on the ballot and on the information page.

## Decision

### 1. A method is a ballot shape, a count, and a description

For each question, the method states:

| Part | Content |
|---|---|
| Ballot | What a voter fills in: one option, several options, a rank for each option, a grade for each option, points. |
| Count | A pure function from the list of ballots to a result, with its tie rule. It is tested without a database and can be re-run by anyone from the published ballots. |
| Result | What is shown: totals, rounds, a pairwise table, grade distributions. |
| Description | A name, a one-line summary, a plain explanation of how the winner is found, and its known limits. In French and English. |

A method has an identifier and a version. The poll stores the identifier and the version it was published with, as it stores the format of the ballot (ADR 0005). A method whose rules change gets a new version. A recount reads the version of the poll.

### 2. Catalogue

#### Decisions between options (one winner)

| Method | Ballot | Count | Notes |
|---|---|---|---|
| Yes, no, abstain | One of three answers | Totals; closing rules apply | Built. Default for a motion. |
| Plurality, first past the post | One option | The option with the most ballots leads. No majority is needed | Built, as one choice among several. Simple. A split among similar options can elect an option most voters rank low. |
| Majority threshold | One option | An option wins only if it has more than half of the ballots cast, or another set share. Otherwise the result is none | Not built as a result rule. Closing rules can already close a poll early when an option reaches a share of the roll. |
| Two rounds | One option in each round | If no option passes a share in round one, a second round opposes the two leading options, or those above a set share | Not built. A second poll linked to the first, with the roll carried over. |
| Approval | Any number of options | The option approved by the most voters | Not built. The engine already has a multiple-choice question. First method to add. |
| Ranked choice, instant runoff | A rank for each option | The option with the fewest first choices is dropped and its ballots pass to their next choice, until one option has a majority | Not built. Result shown round by round. |
| Condorcet methods (Schulze, ranked pairs) | A rank for each option | Options are compared in pairs. An option that beats every other wins. Where no such option exists, a stated rule picks one | Not built. Result shown as a table of pairs. |
| Borda count | A rank for each option | Points by rank are added | Not built. Sensitive to the addition of similar options. |
| Score voting | A score for each option, on a numeric scale | The scores are added | Not built. |
| Grading, majority judgment | A grade for each option, on a verbal scale (for example Excellent to Reject) | The option with the best median grade wins. Ties are broken by removing the median grade and comparing again | Not built. The result is shown as a distribution of grades for each option. |
| STAR (score, then automatic runoff) | A score for each option | The two options with the highest total go to a runoff decided by the ballots that prefer one to the other | Not built. |
| Consent | Consent, objection or abstention | A proposal passes when no objection stands after discussion | Not built. Needs a discussion step. Part of the sociocratic mode of ADR 0003. |

#### Several winners

| Method | Ballot | Count | Notes |
|---|---|---|---|
| Block voting | N options | The N options with the most ballots win | Not built. Plurality with N seats. |
| Limited voting | Fewer options than seats | The options with the most ballots win | Not built. |
| Single transferable vote | A rank for each option | Quota, then transfers of surplus and of dropped options | Not built. For councils and boards. Count is long and needs a tested reference. |
| Proportional lists (D'Hondt, Sainte-Laguë) | One list | Seats by divisor | Not built. |

#### Allocation and opinion polling

| Mode | Ballot | Result | Notes |
|---|---|---|---|
| Points allocation, cumulative voting | A budget of points shared among options | Points added | Not built. Participatory budgeting. |
| Quadratic voting | Points with a cost that rises by the square | Points added | Not built. Needs a policy on identity (ADR 0003, assurance levels). |
| Rating scale (agreement scale) | One grade on a scale for each statement | Distribution for each statement | Not built. Opinion poll, no winner. |
| Free text, number | Text or a number | List or summary | Not built. The engine has both types. |

A poll that only measures opinion has no decision to take. Such a poll shows its distribution and does not name a winner.

### 3. What each method changes in the engine

1. **Question types.** `type` takes the values of the table: `single` and `yes-no` today, then `multiple` (approval), `ranking`, `grades`, `points`. `config` holds the parameters (minimum and maximum selections, the grade scale, the number of seats, the points budget). No column is added (ADR 0010 section 1).
2. **Ballot content.** A ballot answer is a string today. It becomes a string, a list of ids, an ordered list or a map from option to grade. The canonical form is JSON with fixed key order, so that the same answers give the same bytes.
3. **Sealed length.** The plaintext is padded to a block of 256 bytes today. A ranking or a grade map of many options can pass this. The block size is set for the poll from its maximum possible answer, so every ballot of a poll still has the same length.
4. **Count.** One pure function for each method in a package of its own, with the reference cases of the published literature as tests. `#totals` calls it by method identifier and version.
5. **Results.** Each method names the parts it displays. The results page and the published record show these parts and the description of the method.
6. **Closing rules.** A threshold of ballots for one option means something only for methods that count ballots for an option. For other methods the rule is refused, as it is today when a poll has several questions.

### 4. Publication and the risk of identifying a ballot

Publishing every ballot beside its receipt code lets anyone recount (ADR 0008). With a single choice, a ballot reveals one answer, and the order of the list does not tie it to a person.

With ranked or graded ballots and many options, the number of possible ballots is large. A voter who is told or paid to cast a given ranking can later find it in the published list, even without a name. This is the pattern attack.

Therefore:

- For `ranking`, `grades` and `points` questions with more than three options, publishing the list of ballots is off by default and shows this warning when turned on.
- The result is still checkable without the list: the ledger lists sealed entries and its root is published. A voter checks that their receipt code is in it.
- A count that is checkable without opening each ballot (a verifiable tally by mixing or homomorphic sums) is the audited scheme of ADR 0002. It is not part of this ADR.

### 5. Tie rules

Each method states its tie rule in its description and applies it in its count. The rule is never a draw unless the poll has chosen one. A draw is performed from a value published after the close, such as the ledger root, so that nobody can choose the outcome before the close. A tie that the rule cannot break is reported as a tie.

### 6. How a method is described

The same four items appear on the builder, the ballot and the information page:

1. **Name** and an icon.
2. **Summary**, one sentence about what a voter does.
3. **How the winner is found**, in steps.
4. **Limits**, in plain terms.

The builder offers each question type as a card with its summary. A card for a method that is not built yet is shown in the information page only, with the state "planned". The builder offers only built methods. The ballot shows the summary of the method of the question above its answers, and a link to the information page.

### 7. Order of work

1. The catalogue as data, the information page, the summaries on the builder and the ballot (built).
2. Approval voting: the `multiple` type end to end, with sealed ballots, counting, results, the closing-rule refusal.
3. Grading (majority judgment) with a scale of 3 to 7 grades, and the grade distribution as a result.
4. Ranked choice (instant runoff) and a Condorcet method, with the table of rounds and of pairs, and the publication warning of section 4.
5. Two rounds: a poll that opens its second round from the first, with the roll carried over.
6. Several winners: block voting, then single transferable vote.
7. Opinion modes: rating scale, free text, number.

## Consequences

- A voter sees, before answering, which method decides the result and how.
- A new method is a set of data and one pure function with tests. The ballot, the sealing and the ledger are the same for every method.
- Methods with ranked or graded ballots carry a publication risk that the interface states.

## Open questions

- Which condorcet completion to offer first: Schulze or ranked pairs.
- The grade scales to ship: three, five and seven grades, with names in French and English.
- Whether the second round of a two-round poll keeps the roll of the first, or adds the people who did not vote.
- Whether a poll may mix methods between its questions. ADR 0010 allows it by type, and the closing rules would apply to the questions that support them.
- A policy on identity for quadratic voting, which needs one person to hold one budget.
