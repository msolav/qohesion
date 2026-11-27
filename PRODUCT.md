# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

SvelteKit with TypeScript, PostgreSQL, shipped as a Docker Compose install (ADR 0001, `docs/adr/0001-stack-and-deployment.md`). Stack choice confirmed by the user on 2026-11-25. The repository holds an application skeleton (SvelteKit 3: the ballot screen preview, version and changelog pages, French and English negotiation) and the libraries under `packages/` (engine, email templates, roll, verification ledger). It cannot hold a vote yet; ballot encryption and tallying are not written.

## Users

**Primary: member voters.** Non-technical members of a member-run organization (an association, a cooperative, a union, a club, any group that decides together), usually on a phone, voting in French, English, or both. They are invited by email and often use the tool only a few times a year, so nothing about it can depend on prior familiarity. Their trust in the process matters more than their delight.

**Secondary: organization admins.** The volunteer secretary or coordinator who creates votes, manages the member roster and roles, sets decision rules, and runs the assembly. Design for them follows the voter surface, not before it.

Other roles (board members, scrutineers, observers) are configurable per organization and are not defined by the product.

## Product Purpose

Qohesion is free, open-source software that lets member-run organizations gather members' intentions and take collective decisions. In many organizations a board or council takes most decisions on its own and sometimes asks the whole membership to pronounce itself; Qohesion supports both. It runs in three modes on one code base (ADR 0003): Light (a quick vote with no account), Full web (a managed web space on the project's hosted service) and Self-hosted (the organization's own server and SMTP service). Success is a decision the membership accepts as fair, taken without the organization depending on a vendor it cannot leave or handing member data to a third party.

## Positioning

Closed SaaS voting platforms hold the members' data on someone else's server with no way out, and heavier election software assumes a professional administrator. Qohesion is open source (AGPL-3.0), can run on the organization's own server or on the project's hosted service (the WordPress model: free software, optional paid hosting, and the right to leave and host it yourself, ADR 0002), and treats structure as configuration: roles, privileges, ballot types, quorum and majority rules are all set by the organization, never hard-coded. It is bilingual French and English from the start, and built for Quebec's Law 25 and the GDPR from the first commit.

## Operating Context

- Organizations of any kind and size, in Quebec first and elsewhere, including settings like Montreal where French and English appear side by side or in alternation.
- Decisions are governed by each organization's own by-laws and by the statute it falls under (cooperatives, non-profits and unions each have their own). Qohesion helps meet obligations and does not replace by-laws or legal advice.
- Members are invited by email: through the organization's own SMTP service when self-hosted, through the project's sending lanes on the hosted service (ADR 0003).
- A self-hosted installation is a small self-managed VPS run by a volunteer, not a professional operations team.

## Capabilities and Constraints

Built so far: the registration roll (address checks, keyed fingerprints, status rules, frozen roll code, amendments), a tamper-evident ledger with receipt codes, French and English verification and sign-in emails, and the ballot screen preview. Planned, tracked in GitHub issues (milestones M0 to M6): organizations with user-defined bodies and roles; email invitation; ballot types (yes/no/abstain, single and multiple choice, approval, ranked choice, multi-seat elections, consultations); configurable quorum and majority rules; open, secret and pseudonymous voting modes; a verifiable tally and audit log; consent, retention, access, erasure and incident tooling for Law 25 and GDPR; an admin translation editor and side-by-side bilingual display.

Constraints:
- No external network calls at runtime other than the configured SMTP: no CDNs, no external fonts, no trackers, no telemetry.
- Must work on old phones and weak connections; casting a vote should work without JavaScript.
- French is the reference locale, and the interface and policies must exist in French.
- Secret ballots must not be linkable to a member through the application or its exports (see `docs/privacy.md` and `docs/threat-model.md`).

Undecided: licensing of translations contributed by third parties, the list of supported languages beyond FR and EN, the final role presets.

## Brand Commitments

- Name: **Qohesion**, domain `qohesion.app`. Tagline: "Decide together" / "Décidons ensemble" (brand register only; all interface text, emails and terms follow the functional register in `docs/content-style.md`).
- Logo: a circle (the Q) whose tail is a check mark rising as a slash, so the name reads Q/ohesion. Assets and rules are in `brand/`. The wordmark is set in Outfit Medium.
- The name and mark are fixed. The visual world is set out in `DESIGN.md` (north star "The Labelled Slip", five ballot templates: Seed Packet, Ballot Paper, Boarding Pass, Guide Map and Standard), confirmed on 2026-11-26 and open to revision.

## Evidence on Hand

- Logo set, avatars and favicons in `brand/`.
- Project documents: `docs/privacy.md`, `docs/threat-model.md`, `docs/content-style.md`, `docs/glossary.md`, `docs/install.md`, and ADRs 0001 to 0005 in `docs/adr/`.
- A running ballot screen preview (`design/prototype/`, published as the dev preview) and the application skeleton in `apps/web`.
- No real members, testimonials, case studies, usage numbers or screenshots exist. Do not fabricate any, and do not invent organizations or member names in interface examples without marking them as sample data.

## Product Principles

1. **Trust before delight.** A voter must be able to tell what they are voting on, what happens to their vote, and that it was recorded. Clarity beats cleverness on every screen they touch.
2. **Structure is configuration.** The product holds no opinion about an organization's chart. Anything an organization may want to change is a setting, with a plain-language preview of what it does.
3. **Two languages are one interface.** French and English are equal. Layouts must hold the longer string and a side-by-side presentation without breaking.
4. **Privacy is visible.** What is stored, for how long, and who can see it is stated at the point of use in plain words, not buried in a policy.
5. **Calm and light, for everyone.** No screen is dense, administrators included: one decision at a time, progressive disclosure over crowded tables and settings walls, plenty of room around what matters. The same restraint applies to hardware: the product runs on a volunteer's small server and a member's old phone.

## Accessibility & Inclusion

WCAG 2.2 AA is the required standard. Keyboard and screen-reader use must work for the whole voting flow. Members include older and less technical people, people on small or aging devices, and people who read French or English as a second language, so plain language and generous touch targets are part of the requirement.
