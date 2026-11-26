# Legal review brief

Status: draft, to be sent to counsel in Quebec once the questions below are agreed. This brief is not legal advice and does not state what the law requires. Every point is a question, and each answer is expected from counsel.

Résumé : liste des questions à soumettre à un conseiller juridique du Québec avant l’ouverture du service hébergé. Les sections sont classées par ordre de priorité. Ce document ne contient aucun avis juridique.

## What Qohesion is

Qohesion is open-source software (AGPL-3.0-or-later) for holding votes and polls in groups such as associations, cooperatives and unions, in French and English. It runs in three modes on one code base (Light, Full web, Self-hosted, see [ADR 0003](adr/0003-three-modes-one-engine.md)). The project also plans an official hosted service, run by an operator who has not yet been named, free within limits and paid beyond them ([ADR 0006](adr/0006-pricing-and-limits.md), proposed). Nothing is hosted for the public yet, no vote can be recorded, and no personal data is held.

## What exists to read

| Document | What it contains |
|---|---|
| [terms-of-use.md](terms-of-use.md) | Draft bilingual terms of the hosted service, with placeholders for the operator |
| [privacy.md](privacy.md) | Approach to Law 25 and the GDPR, roles, and the erasure problem |
| [templates/](templates/README.md) | Fill-in privacy policy and impact assessment for installing organizations |
| [threat-model.md](threat-model.md) | What the software protects against and what depends on trusting an administrator |
| [adr/0002](adr/0002-editions-hosting-and-trust.md), [0003](adr/0003-three-modes-one-engine.md) | Editions, trust model, registration roll, email safeguards, cross-organization checks |
| [trademark-policy.md](trademark-policy.md) | Draft name and logo policy |
| [LICENSING.md](../LICENSING.md) | Which licence covers what, and why |

## Questions, in order of priority

### A. Before the hosted service opens to the public

1. **Operator and liability.** Which entity should contract with customers and hold the data-protection duties: an existing incorporated company, a new company, or an individual? What does each exposure look like for a service that holds member lists and records votes? What insurance (cyber, errors and omissions) is usual?

   The operator is expected to be an existing registered business that is not incorporated. Incorporation and insurance are deferred until the service has paying customers, and until then costs are kept minimal. Counsel is asked what exposure that leaves in the meantime, and at what point (for example holding real member lists, or the first payment) the arrangement should change.
2. **Terms of use.** Are the terms enforceable as drafted? In particular the limit of liability (section 11), the governing law and forum (section 12), the language clause (section 13) and the notice of changes (section 14). Which rules of the *Charter of the French language* apply to a contract of this kind offered to organizations? Are any customers likely to count as consumers?
3. **Personal information.** In the hosted service, which party is the person responsible for the information and which acts for it? What must the operator itself do under Law 25 (a person in charge, an incident register, impact assessments, rules on hosting or processing outside Quebec)? Review of the privacy policy and impact-assessment templates.
4. **Electronic messages.** The service sends a verification email to an address that an organizer entered, at the request of the person who then confirms it ([ADR 0003](adr/0003-three-modes-one-engine.md) sections 5 to 7). Does Canada's anti-spam law treat these messages as commercial? What consent, identification and unsubscribe rules apply? Is the organizer attestation described in section 6 sufficient, and what should it say?
5. **Cross-organization fingerprints.** ADR 0003 section 8 compares member addresses across organizations only as keyed fingerprints, to limit abuse of the free allowance. Is a keyed fingerprint personal information? What notice, retention period and impact assessment does this need, and is the purpose proportionate?

### B. Before anyone is charged

6. **Terms of sale.** Refunds, the event pass, and the payment processor's terms, as proposed in ADR 0006. If an annual plan is added later, which consumer-law rules on renewal apply?
7. **Taxes.** Registration thresholds and treatment of GST and QST. This may be a question for an accountant instead.
8. **Trademark.** Review of the [draft policy](trademark-policy.md); who should own the marks (the operator or an individual); when and where to register; and how to handle a look-alike service.

### C. About what the software says and holds

9. **Validity of electronic votes.** The terms say that validity depends on each organization's by-laws and governing statute. Is that wording enough? What may the website and the interface say about legal validity without creating a promise?
10. **Erasure and a verifiable vote.** [privacy.md](privacy.md) separates who voted from what was voted so that erasure does not break the count. Does that approach hold for secret ballots, and for open ballots recorded in minutes (the points marked to verify)?
11. **Licence and contributions.** Contributions are accepted under the Developer Certificate of Origin and keep their authors' copyright. Is that sufficient for a project that later sells a hosted service, or is a different arrangement needed? Is the footer source link enough to satisfy section 13 of the AGPL for the hosted service?
12. **Vulnerability reports.** Review of [SECURITY.md](../SECURITY.md) and the liability that comes with a public disclosure policy.

## Not for counsel

The choice of the encryption and counting scheme for ballots is a technical decision, recorded in [ADR 0002](adr/0002-editions-hosting-and-trust.md). No customer data exists, so none will be sent.

## What to ask counsel for

A fixed fee for group A first, with a written list of changes to the terms and the privacy documents. Groups B and C can follow once the operator and the prices are settled.
