# ADR 0003: Three modes, one engine

- Status: proposed
- Date: 2026-11-25
- Extends: [ADR 0001](0001-stack-and-deployment.md) (stack), [ADR 0002](0002-editions-hosting-and-trust.md) (editions and trust)

## Context

The project offers voting and polling to groups of different sizes and needs. A single code base must serve a quick vote with no account, a managed web space, and an installation on the group's own server. Sending email is the main operational risk of any hosted mode, because abuse harms deliverability for every user.

## Decision (proposed)

### 1. Three modes on one engine

| Mode | Accounts | Data kept | Email | Typical use |
|---|---|---|---|---|
| **Light** | None | Encrypted ballots on the server until a set date after closing, then deleted. The decryption key stays in the administrator's link and never reaches the server. | Shared link; on-demand verification email only | Informal polls and consultations |
| **Full web** | Yes | Database, encrypted, minimal | Verified domain of the organization, or the shared lane | Recurring votes, member management |
| **Self-hosted** | Yes | On the group's own server | The group's own SMTP service (required) | Control over data location |

One code base. The storage layer is an interface with interchangeable adapters, so ephemeral and persistent storage share the same application code.

### 2. Settings use the same question engine as ballots

The setup wizard (template, colours, fonts where the template allows them, organization information, voting rules, languages) is built from the form and question engine that also produces ballots. A setting is a form answer stored as configuration. It is not a ballot and does not use ballot encryption or receipts. Settings that need a preview or a test (email, decision rules) are grouped on a separate advanced page.

### 3. Roles

- **Owner:** manages the platform account (billing, settings, deletion). Several owners are allowed; two are recommended.
- **Administrator:** performs ballot duties (approves the roll, holds a share of the key, sees every roll change).
- The account belongs to the organization, not to a person. Ownership can be transferred (the recipient accepts). Succession by a majority of administrators, and a member-initiated challenge decided by a vote on the platform, are later features. Election results can propose the new administrators.

### 4. Registration phase and roll

1. Administrators enter the addresses. The form checks syntax, suggests corrections for common domain typos, and checks that the domain accepts mail.
2. Each member registers by confirming their own address. The administrator never receives the member's personal link.
3. Registration closes. The roll is frozen and published as a count and a short code. At the formal level, the other administrators co-sign it.
4. Additions after the freeze are allowed. Each is recorded with time and author, requires a second administrator's approval at the formal level, and shows as "added late".
5. Registered members see the number registered. Turnout during voting is hidden by default.

The administrator sees one status per address: listed, requested, confirmed, voted (yes or no, never the choice), withdrawn, bounced. An address that is not on the list but tries to join appears masked in the administrator's view and can be added in one step.

An "informal one-step" option combines confirmation and voting for informal polls. It does not freeze the roll before the first ballot.

### 5. Invitation delivery

- **A. Shared link with a pre-registered list.** The organizer shares one link through their own channels. A member enters an address; if it is on the list, one verification email is sent. If not, nothing is sent, and the same neutral message appears either way.
- **B. Personal links bound to an address.** Links are distributed by the organizer (CSV mail merge or the organizer's own provider). A link works only after the assigned mailbox verifies it, so holding the link does not allow voting.
- **C. Sending through the organizer's own provider** (later; requires storing a key).

In the Light mode, delivery option A is the default, with a ready-made invitation text in each language to copy into any message.

### 6. Safeguards against abuse

Accepted limits: a determined administrator can script the member step. The aim is to bound the harm.
- Bounce budget (about 5%) stops sending for that organizer.
- No more than one verification email per address per day; per-recipient-domain hourly limits.
- Anti-robot check on the shared link and on registration.
- Sending quota that grows with the confirmation rate.
- Circuit breaker per organizer account (software counters, not subdomains).
- Complaints and one-click unsubscribe handled automatically. A complaint withdraws the address from that poll and weighs heavily in the organizer's score, because every message answers a request.
- Organizer attestation, at the moment of sending, that permission exists to contact the listed people, with identity details recorded.
- Safety ladder, depending on cause:
  - **Accident** (bounces over budget, normal confirmations): pause the unconfirmed remainder, show the administrator the bad addresses, extend deadlines by the length of the pause.
  - **Abuse** (complaint spike, near-zero confirmations): suspend the whole poll, notify administrators, review.
- A score that fades over time. Resumption after a severe event requires a verified own domain or own SMTP service, or a review.
- Reserved names for organization spaces, to prevent impersonation.

### 7. Free allowance

- One verification email per participant in the free lane. Reminders and "voting open" notices are the administrator's task through the shared link.
- A monthly **allowance of verification emails** per organizer. At registration the organizer chooses the balance: larger groups with fewer polls, or smaller groups with more polls. The product of participants and polls stays within the allowance, up to a maximum number of participants and polls.
- A global daily budget protects the free lane's cost. When the day's budget is used, further verification waits for the next day or the organizer upgrades.
- Limits apply to new polls only. A poll in progress is never reduced.
- Above the free limits, plans are priced by number of members. Custom features requested by a customer are quoted for integration and published under the AGPL for everyone.

### 8. Multiple accounts and overlapping lists

- The free allowance attaches to the verified organizer address, normalized (plus-addressing and dots removed where the provider ignores them), and to the organization identity details.
- Member addresses are compared across organizations only as keyed fingerprints (HMAC), never in clear text. A high overlap between lists of different accounts flags them as a possible group.
- Flagged accounts share one allowance. The organizer can declare accounts as related (for example a federation and its member groups), which also shares the allowance without penalty. Low overlap is normal and not flagged: a person can belong to several groups.
- Per-address limits apply across all organizations (verification emails per day and per week). An address that appears in many lists at once is rate-limited and flagged.
- Fingerprints and counters are kept for the shortest period that supports these checks. This needs a privacy impact assessment before use.

### 9. Sending infrastructure

- **Transport interface.** The application sends through an `EmailTransport` interface with interchangeable adapters (Cloudflare Email Sending, SMTP, Resend, Amazon SES). Self-hosted installations use the SMTP adapter. The provider choice is therefore not a lock-in.
- **Initial provider (revised 2026-11-25): no fixed monthly fee.** Cloudflare Email Sending was considered first. Reaching arbitrary recipients requires the Workers Paid plan, a base fee of $5 a month plus usage, which is not wanted before there is real traffic. Providers without a base fee are used instead:
  - **Brevo, free plan, first** (300 emails a day, marketing and transactional combined; SMTP relay, API and webhooks included). It serves both service emails and the free voting lane at the start.
  - **Resend, free plan, as the standby** (3,000 a month, 100 a day), configured so that service emails can fail over to it. The voting lane fails over only by decision, so that an abuse event does not spread to a second account.
  - **When volume exceeds the free plans:** a paid plan funded by revenue, or Amazon SES pay-as-you-go (about $0.10 to $0.16 per 1,000 emails, no monthly fee; leaving the sandbox requires a request to AWS).
  - **Budget guard in the application.** The Brevo daily limit is shared by every message. The application reserves part of it for service emails (for example 50 of 300), so that a large poll cannot block sign-in emails.
  - **Known Brevo constraints to verify with a test send:** the free plan adds a "Sent with Brevo" sticker (whether it appears on SMTP and API transactional messages is unconfirmed; removal needs a paid plan); new accounts may be reviewed before sending; the sending domain must be authenticated (a verification code record, DKIM, DMARC) or Brevo replaces it with its own; inbox placement is tested with Gmail and Outlook.
  - Cloudflare Email Sending is revisited if the application runs on Workers and the base fee is justified by other use. Its free plan remains usable to test a sending domain against verified addresses.
  Prices and limits are checked against each provider's page before each decision.
- **Account risk.** The Cloudflare account holds domain registration and DNS. Sending is kept in separate provider accounts, so an abuse event in the free voting lane cannot put the domain or DNS at risk.
- **Lanes.** Service emails (login, administrator notices) go from a subdomain of `qohesion.app`. The free voting lane uses a separate domain on a reputable TLD, in its own provider account. Paid organizations send from their own verified domain.
- **TLD choice.** A country-code or low-cost TLD with a high abuse rate can reduce inbox placement. `.cc` appears in the higher-risk group of recent spam-reputation reports. A reputable TLD (such as `.ca` or `.org`) is preferred. Deliverability is tested with Gmail and Outlook before use.
- **Capacity.** Until the real daily quota is known, the free lane accepts small polls (target: up to 50 participants). When 70% of a provider limit is reached, capacity is raised (quota increase request, or paid plan) so that new registrations are served immediately.

### 10. Content style

All text follows [docs/content-style.md](../content-style.md), which defines two registers: a functional register (interface, emails, terms, documentation) that is objective, neutral, descriptive and procedural with no assumed context, and a brand register (tagline, headlines, social profiles) that is engaging and human but truthful. One language is displayed at a time, with a language switcher.

## Consequences

- The question engine is built first, because settings and ballots depend on it.
- The Light mode forces the encrypted-ballot design early and is the smallest complete product.
- Several rules (fingerprints across organizations, attestation, complaint handling, first-contact emails under Canada's anti-spam law) need review by a lawyer before launch.
- Free capacity is bounded by the provider's free tier until paid plans fund more.

## Open questions

Exact quotas and the participants-versus-polls balance values. Thresholds for the bounce budget and the overlap flag. Whether Light mode needs more than one administrator at the informal level (currently allowed, with a visible warning). The sending domain name.
