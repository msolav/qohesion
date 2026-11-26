# Changelog

All notable changes are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major number is 0 the project is in alpha: any minor version may change behaviour or data formats, and each entry says so under "Upgrade notes".

## [Unreleased]

No version has been published yet. `0.1.0` is the first planned tag.

### Added
- Question and form engine (`packages/engine`): single choice, multiple choice, text, number, colour (with contrast rules) and toggle questions; conditional steps; validation with error codes; list of untranslated texts.
- Version tools in the engine: parsing and comparing versions, release channel (alpha, beta, stable), display text, and an assessment of an update from one version to another.
- Email package (`packages/email`): Brevo and Resend transports behind one interface, failover for service emails (not for the voting lane), a daily budget guard with a reserve for service emails, message checks (addresses, header injection) and one-click unsubscribe headers. A script (`scripts/send-test-email.mjs`) sends one test message to check the sending domain. Templates for the verification email and the administrator sign-in email, in French and English, with no image or tracking in the HTML. A second script (`scripts/inspect-eml.py`) reads a received message and fails on a failed DKIM or DMARC check, a tracking image, a provider footer or a wrapped link.
- Roll package (`packages/roll`): address checks and canonical form, typo suggestions for common domains, keyed fingerprints and overlap measures, the status machine of an address across the registration, frozen, voting and closed phases, the frozen roll as a count and a short code, amendments with approvals, administrator setup checks (threshold keys) and the assurance level with what is missing for the next one.
- Ballot-screen prototype with two templates (Seed Packet, Ballot Paper), an organization colour scheme checked for contrast, and French and English display.
- Placeholder website at qohesion.app and a development preview at dev.qohesion.app.
- Licensing framework (AGPL-3.0-or-later for code, CC BY-SA 4.0 for documentation, CC BY 4.0 for templates, name and logo not open), checked with the REUSE tool.
- Decision records 0001 to 0004, content style guide, draft terms of use for the hosted service.

### Upgrade notes
None. Nothing has been released.
