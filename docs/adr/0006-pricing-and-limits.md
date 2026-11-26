# ADR 0006: Pricing and limits for the hosted service

- Status: proposed
- Date: 2026-11-26
- Extends: [ADR 0002](0002-editions-hosting-and-trust.md) (editions and hosting), [ADR 0003](0003-three-modes-one-engine.md) (free allowance, section 7)

## Context

The hosted service pays for the project (ADR 0002). Two rules already bind the price: paying never unlocks features, and plans differ only by limits, hosting and support ([LICENSING.md](../../LICENSING.md), [terms of use](../terms-of-use.md) section 8). Free capacity is bounded by the sending providers' free plans (ADR 0003 sections 7 and 9).

Member-run organizations vote a few times a year, often at one annual meeting. A monthly subscription fits that pattern badly, and a card on file that renews unnoticed is a source of complaints.

### Evidence, checked on 2026-11-26

Sending costs, from each provider's own pages. Brevo's pricing page could not be read directly; its figures come from its other public pages, which were between two months and a year old, so they are checked again before any decision.

| Provider | Free | Paid |
|---|---|---|
| Brevo | 300 emails a day (9,000 a month), no daily limit on paid plans | Starter US$9 a month (CA$10) from 5,000 emails |
| Resend | 3,000 a month, 100 a day | Pro US$20 a month for 50,000 emails |
| Amazon SES | none | US$0.10 per 1,000 emails, no monthly minimum |

A 300-member vote sends 300 to 600 emails: about US$0.03 to US$0.06 at the SES rate. Email is not the cost that matters. The costs that matter are a server, an email plan once the free plans are outgrown, accounting and insurance, payment-processor fees, and above all time for support. The server, insurance and processor figures have not been researched yet.

What similar services charge, per election. Figures marked (reported) come from third parties, some of them competitors, and have not been confirmed.

| Service | Price |
|---|---|
| Election Runner | free under 20 voters; $19 up to 100; $36 up to 300; a calculator above 300 (currency not stated on the page) |
| Simply Voting | no published tiers; about $200 for 100 to 300 electors (reported, from its own calculator) |
| Others | about $10 to $29 for 100 voters; $99 to $299 per election for larger associations (reported) |

No comparator was found for 1,000 voters or more.

## Decision (proposed)

1. **Two offers at launch: Free and Event pass.** No subscription at launch.
2. **Free.** Small polls within the monthly allowance of verification emails (ADR 0003 section 7), with the target of up to 50 participants a poll.
3. **Event pass.** One payment per voting event, priced by the size band of the roll. An event is one vote or poll with its roll, open for at most [30 days]. A pass includes the verification email for each participant, the receipts and the export of results.
4. **Starting prices, in Canadian dollars before tax.** They are a starting point to adjust after the first customers, not a validated figure.

   | Roll size | Event pass |
   |---|---|
   | up to 100 | 19 |
   | up to 300 | 39 |
   | up to 1,000 | 99 |
   | up to 5,000 | 249 |
   | above 5,000 | quoted |

   The first two bands sit at or just above the cheapest self-service comparator, so the service is neither the lowest price nor an outlier. The two upper bands have no comparator and rest on judgment.
5. **Not at launch.** An annual plan (added when organizations ask for it or repeat use shows it is wanted), metering by voter beyond the band, and any form of price by feature (never).
6. **Self-hosted** stays free. Installation, support and custom work are quoted, and custom features are published under the AGPL (ADR 0003 section 7).
7. **Changes to prices** are announced at least [60 days] ahead (terms of use section 7) and never apply to an event already paid for.

## Consequences

- Section 8 of the terms of use can be completed once the prices and the definition of an event are confirmed.
- A payment processor, the tax treatment (GST and QST) and the refund rule must be chosen, and the terms of sale reviewed by counsel before the first payment. Counsel also reviews consumer-law rules if an annual plan is added later.
- The hosted service does not open before ballots can be encrypted and counted, so no price is published yet.

## Open questions

- Whether a band is fixed at payment or moves up if late additions exceed it.
- A discount for volunteer-run groups, and what proves eligibility.
- Display of taxes, and whether to show a US-dollar price.
- What is included in a reminder email for paid events (ADR 0003 section 7 leaves reminders to the administrator in the free lane).
- When the annual plan is added.
- The French name of the event pass, to add to the [glossary](../glossary.md).
