<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/qohesion-logo-dark.svg">
    <img src="brand/qohesion-logo.svg" alt="Qohesion" width="420">
  </picture>
</p>

**Decide together. Décidez ensemble.**

Qohesion is a free, self-hosted voting and decision tool for member-run organizations: housing co-ops, associations, unions, community groups. You install it on your own server, connect your own SMTP service, and your members' data stays with you.

Qohesion est un outil libre de vote et de prise de décision, à installer sur votre propre serveur, pour les organisations dirigées par leurs membres : coopératives d'habitation, associations, syndicats, groupes communautaires. Vous branchez votre propre service SMTP, et les données de vos membres restent chez vous.

> **Status / Statut :** pre-alpha. Design phase, nothing to install yet. Follow the [roadmap](../../milestones) and the [issues](../../issues). / Phase de conception, rien à installer pour l'instant.

---

## Why / Pourquoi

A housing co-op's board of directors takes most decisions on its own, and sometimes asks the whole membership to weigh in. Existing tools are either closed SaaS platforms (your members' data lives on someone else's server), too heavy for a volunteer-run organization, or built for one country's election rules.

Qohesion aims to be:

- **Simple to host.** One Docker Compose file on a small VPS. Backups and upgrades documented for non-specialists.
- **Flexible, not prescriptive.** No hard-coded organization chart. Roles, permissions, ballot types, quorum and majority rules are configuration, because every set of by-laws is different.
- **Private by design.** Built to meet Quebec's Law 25 and the GDPR from the first commit, not retrofitted. See [docs/privacy.md](docs/privacy.md).
- **Bilingual from day one.** French and English side by side or in alternation, with translation tools in the admin interface, and room for more languages.
- **Honest about trust.** Voting software is only as trustworthy as it is inspectable. The code is AGPL-3.0, the threat model is public, and the anonymity guarantees are written down with their limits. See [docs/threat-model.md](docs/threat-model.md).

## What it will do / Ce que ça fera

- Member registration and invitation by email (your SMTP), with configurable roles and privileges.
- Multiple ballot types: yes/no/abstain, single choice, multiple choice, approval, ranked choice, multi-seat elections, consultations with free-text comments.
- Configurable decision rules: quorum, simple majority, two-thirds, per-body thresholds.
- Open, secret or pseudonymous ballots, chosen per vote.
- Proxies and delegation where the by-laws allow it.
- Audit log, verifiable tally, minutes-ready exports.
- Privacy tooling: consent records, retention schedules, access and erasure requests, incident register.

## Not legal advice / Avis juridique

Qohesion helps an organization meet its obligations, it does not replace your by-laws, your general assembly rules or a lawyer. Whether an electronic vote is valid for a given decision depends on your constitution and applicable law (for Quebec co-ops, notably the *Loi sur les coopératives*). / Qohesion ne remplace ni vos règlements, ni vos règles d'assemblée générale, ni un avis juridique.

## Contributing / Contribuer

Read [CONTRIBUTING.md](CONTRIBUTING.md). Translations, accessibility testing, and feedback from people who run real assemblies are especially welcome. To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License / Licence

[GNU AGPL-3.0](LICENSE). If you run a modified version as a service, you must offer your members the modified source.
