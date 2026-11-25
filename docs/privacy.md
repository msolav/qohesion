# Privacy approach: Law 25 (Quebec) and GDPR

> This document states design intentions and a compliance checklist. It is not legal advice. Each organization that installs Qohesion is the **data controller** (*responsable du traitement* / *organisation*) and remains responsible for its own compliance. Have a lawyer review before relying on it. Items marked **[verify]** need legal confirmation.

## Roles

- The **organization** running an instance is the controller. The Qohesion project does not host or receive any instance data.
- Qohesion ships no telemetry, no third-party trackers, no external fonts or CDNs. An instance only talks to the organization's own SMTP server.

## Principles we build to

| Principle | Law 25 (Quebec) | GDPR | Design response |
|---|---|---|---|
| Accountability | Person in charge of personal information protection (*responsable de la protection des renseignements personnels*), publish governance policies | Art. 5(2), 24, DPO where required | Admin setting naming the privacy officer; their contact shown on every public page; policy template editable and published in-app |
| Consent and purpose | Clear, specific consent, in plain language | Art. 6, 7 | Consent records with timestamp, purpose and text version; separate consents for optional uses; no pre-ticked boxes |
| Minimization | Collect only what is necessary | Art. 5(1)(c) | Only email and display name required. Every other member field is optional and admin-defined, with a stated purpose |
| Privacy by default | Highest-privacy settings by default | Art. 25 | Secret ballot default for new votes; results visibility defaults to aggregate only |
| Retention limits | Destroy or anonymize when purpose is fulfilled | Art. 5(1)(e) | Configurable retention schedule per data class; scheduled purge job; ballots anonymized after the challenge period |
| Access and portability | Access, rectification, portability in a structured, commonly used format | Art. 15, 16, 20 | Member self-service export (JSON and CSV), rectification form |
| Erasure | Cessation of dissemination and de-indexation rights **[verify scope]** | Art. 17 | Erasure workflow that preserves the integrity of past tallies (see below) |
| Security | Reasonable safeguards | Art. 32 | See [threat-model.md](threat-model.md): encryption at rest and in transit, hashed credentials, least-privilege roles |
| Incidents | Keep a register of confidentiality incidents; notify the CAI and affected persons when there is a risk of serious injury | Art. 33, 34 (72 hours to the authority) | Incident register in the admin UI with a notification template for the CAI and members |
| Impact assessments | Privacy impact assessment (*évaluation des facteurs relatifs à la vie privée*) for projects involving personal information systems **[verify]** | Art. 35 | Pre-filled PIA / DPIA template shipped in `docs/templates/` |
| Records | Inventory of personal information held | Art. 30 | Auto-generated record of processing from the instance configuration |
| Transfers | Assess before sending outside Quebec | Chapter V | Everything stays on the organization's server; the only external hop is the SMTP provider, which the admin must declare |
| Language | Interface and policies available in French (Charter of the French language) | n/a | French is a first-class locale and the default; policies always rendered in French and English |

## The hard problem: erasure vs. a verifiable vote

A vote needs an auditable tally. A privacy law gives people erasure rights. Qohesion resolves this by separating **identity** from **ballot**:

1. **Who voted** (the participation record, linked to a member) is stored separately from **what was voted** (the ballot, linked to nothing).
2. For secret ballots there is no stored link between a member and their choice. Erasing a member removes their participation record and personal data; the anonymous ballot stays, since it is no longer personal information.
3. For open ballots (recorded votes, for example a board resolution where each director's vote is minuted), the choice is personal information and is governed by the retention schedule and by the minutes the organization is legally required to keep. **[verify]**
4. After the challenge period set by the organization, the linkage data used during voting (tokens, timestamps fine enough to correlate) is deleted.

The exact guarantees and their limits are in the [threat model](threat-model.md). Where a guarantee depends on trusting the server administrator, we say so.

## What an installing organization must still do

- Name a person in charge of personal information protection and publish their contact.
- Adopt and publish a privacy policy (a template is provided).
- Complete the PIA for their own context.
- Choose an SMTP provider and assess where it processes data.
- Set retention periods that match its by-laws and legal minutes requirements.
- Secure and back up the server.

## Sources to review with counsel

- *Act respecting the protection of personal information in the private sector* (CQLR c P-39.1), as amended by Law 25
- Regulation (EU) 2016/679 (GDPR)
- *Charter of the French language* (CQLR c C-11)
- *Loi sur les coopératives* (CQLR c C-67.2) for co-op decision rules
- Commission d'accès à l'information du Québec guidance on incidents and PIAs
