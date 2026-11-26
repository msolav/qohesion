---
version: 1
slug: "design-site"
primary_target: "design/site"
related_targets: ["design/site/build.mjs","design/site/site.css"]
---

# Surface brief: the Qohesion website (design/site)

## Scope and visitor mode
The public website, French at the root and English under /en/. Home is Persuade, written in the functional register. Pricing is a decision page on the night ground. Terms, name and logo, and documentation are Read surfaces.

## Audience, job, action, proof, constraints
- Audience: a secretary, a board member or a volunteer who must run a vote for a member-run group, and the person who hosts it.
- Job: understand in one screen what Qohesion is, see the real ballot screen, learn what exists and what does not, what it costs, and where the source is.
- Action: read the source, read the pricing. Nothing can be bought or voted on yet.
- Proof: the live ballot screen prototype, the Merkle ledger facts from the tests, the Docker hardening facts from the install guide. No invented customers, quotes, figures or photographs.
- Constraints: no request to another site, no script except the root language redirect, WCAG 2.2 AA, 390px first, reduced motion respected, content-style.md functional register, no claim about a feature that does not exist.

## Chosen direction and memorable moment
The navy landing page that already stands at qohesion.app and dev.qohesion.app, expanded. Memorable moment: the receipt code settling into focus as its section enters the screen.

## Unresolved
Logo lockup on the paper pages, operator name in the footer, a share image, the final domain in canonical links.

## Direction contract

THESIS: The site is the ballot room at night: a deep navy ground, the lit logo, and the real ballot screen running live inside a phone-sized frame. It refuses the SaaS template, a centred headline over a row of equal icon cards, glow gradients and stock people.

OWN-WORLD: Night Navy #0F224C ground with raised navy #17306A and rule #3A5287. Text in mist #EAF2FF, #C9D8F2 and #A9BEE6. Mint #7FD1A4 is for focus and the check. The logo's blue-to-cyan Q and green check are the only gradient on the site. The brand line is set in Outfit, everything else in Figtree. Long text sits on a mist paper sheet laid on the navy. Device frames hold the live prototypes. No illustration, no photograph, no icon set.

STORY: The visitor learns what Qohesion is, sees the real ballot screen, reads that the vote and the count are not written yet, sees the Merkle ledger and the hardened container as checkable facts, and leaves with the source or the pricing open.

FIRST VIEWPORT: Left, the brand line "Décidons ensemble." at display size, one functional sentence, one status sentence, a line of hard facts and two actions, source code first. Right, a phone-sized frame holding the live Seed Packet ballot screen. Masthead: logo, Pricing, Documentation, FR and EN.

FORM: pinned by the user: "keep basing the design of the web interface on the temporary landing page we have with the blue background. Let's expand that", and "I want that dev shows something as close as possible to the future public site". seed: none (pinned).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
