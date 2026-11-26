---
version: 1
slug: "design-prototype-index-html"
primary_target: "design/prototype/index.html"
related_targets: []
---

# Surface brief: voter ballot screen (design/prototype)

Mode: Operate. Phone-first, also reads on desktop.

## Audience and task
Members of any member-run organization voting from an emailed link, in French, English or both. Job: understand the question, choose, submit, see that the vote was recorded. Constraints: no dense screens (administrators included), WCAG 2.2 AA, works on old phones and weak connections, casting a vote works without JavaScript, no external requests.

## Decision
The user pinned two directions in conversation, and the four discarded worlds are out. Qohesion ships a template system: **Seed Packet** (default) and **Ballot Paper**, each a token set plus component treatments, with an organization-set colour scheme guarded for contrast. Boarding Pass (change marker, receipt block), Guide Map (capsule choices) and a plain category-standard form stay as candidate templates for later; none is built now.

## Direction contract

THESIS: A vote is one small, clearly labelled thing a member decides once. The surface refuses the dashboard-with-form arrangement: one question, one decision, nothing else on screen.

OWN-WORLD: Seed Packet: a variety-label header block in the organization's brand colour with a tab, a three-cell culture table for quorum, majority and secrecy, large bordered choice rows, flat spot colour on a faintly green white, Figtree, one saturated accent reserved for the cast button. Ballot Paper: a white ruled slip with a double rule under the head, circle marks that take an X, a perforated stub for the receipt, Public Sans, ink on near-white. Neutrals snap to a short fixed ramp in both.

STORY: The member understands what is being decided, when it closes, what counts as a pass and that the ballot is secret. They believe the choice is private because the page says so at the point of use. They choose and cast.

FIRST VIEWPORT: At 390 by 844, a slim bar with the organization name and the FR/EN control, then the question block with title and English subtitle and the deadline, the three facts, three choice rows of at least 56px, the privacy line, and a fixed cast button at the foot. The cast button is the only saturated accent.

FORM: Seed Packet is the assigned candidate (5 of 7 in my list); Ballot Paper is my top-ranked candidate (1 of 7), taken as second template by the user's request. seed:f2f695e9cea37afa

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
Dark mode and high-contrast variants; admin screens (to be designed in the same system, kept sparse); the list of languages beyond FR and EN; whether organizations may upload their own logo or only choose colours.
