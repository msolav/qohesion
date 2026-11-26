# Pricing tiers (draft)

Status: draft. Proposed in [ADR 0006](adr/0006-pricing-and-limits.md). The hosted service does not exist yet, nothing can be purchased, and the prices are a starting point that is not final. Amounts are in Canadian dollars before tax. This page describes planned offers. French version: to come.

## The offers

| | Free | Event pass | Self-hosted |
|---|---|---|---|
| Price | 0 | One payment per voting event, by size (see below) | 0 for the software |
| Used for | Small polls | A vote or poll on the hosted service, up to 5,000 addresses on the roll | Running the software on the organization's own server |
| Roll size | Up to 50 participants a poll | Up to the size paid for | No limit set by the software |
| Events | As many as the monthly allowance of verification emails permits | One event per pass | No limit set by the software |
| Verification emails | One per participant, within the monthly allowance | One per participant, included [reminders: to define] | Sent through the organization's own SMTP service |
| Features | All | All | All |
| Where data is kept | The hosted service [location: to define] | The hosted service [location: to define] | The organization's own server |
| Support | Public issue tracker | Email [response time: to define] | Public issue tracker. Paid support is quoted |

## Event pass sizes

The size is the number of addresses on the roll.

| Addresses on the roll | Price |
|---|---|
| Up to 100 | 19 |
| Up to 300 | 39 |
| Up to 1,000 | 99 |
| Up to 5,000 | 249 |
| More than 5,000 | Quoted |

## The same in every offer

- The software and all of its features. A payment changes limits, hosting and support. It never unlocks a feature.
- The licence: the code is under the AGPL-3.0-or-later, and the [terms of use](terms-of-use.md) allow an organization to close its account and export all of its data at any time.
- Receipt codes and verification of the result.

## What counts as an event

An event is one vote or poll with its roll, open for at most [30 days]. A second vote with the same roll is a second event. [To define: whether the pass covers a second round of the same vote.]

## Not decided

- Whether the size is fixed at payment or moves up if late additions exceed it.
- A discount for volunteer-run groups, and what proves eligibility.
- Display of taxes.
- An annual plan, which is not offered at launch.

The reasoning, the figures that support the prices and the open questions are in [ADR 0006](adr/0006-pricing-and-limits.md).
