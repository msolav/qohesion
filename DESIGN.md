---
name: Qohesion
description: Software for holding votes and polls in groups. Decide together.
colors:
  forest-ballot: "#1F5C46"
  white-label: "#FFFFFF"
  signal-red: "#C63A22"
  ink: "#14151A"
  seed-paper: "#EEF3E9"
  sprout-hover: "#F6FAF2"
  moss-ink: "#3F4F45"
  ledger-grey: "#E9E9E3"
  slip-white: "#FBFBF8"
  slip-hover: "#F1F1EC"
  pencil-grey: "#4C4C47"
  error-red: "#B3261E"
  night-navy: "#0F224C"
  night-raised: "#17306A"
  night-rule: "#3A5287"
  mist: "#EAF2FF"
  mist-soft: "#C9D8F2"
  mist-dim: "#A9BEE6"
  mint: "#7FD1A4"
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.6rem, 6.2vw, 2.05rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.2
  cast:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.1rem"
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum'"
  label:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
    lineHeight: 1.45
  note:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.35
  small:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.35
  receipt-code:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
  document:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'tnum'"
  site-display:
    fontFamily: "Outfit, Figtree, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 8vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  site-headline:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  site-lede:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.5
  site-name:
    fontFamily: "Outfit, Figtree, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1.15
  site-receipt:
    fontFamily: "Outfit, Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 8vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.06em"
  body-ballot-paper:
    fontFamily: "'Public Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum'"
  email:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.88em"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  seed-packet: "14px"
  packet-head: "22px"
  packet-tab: "8px"
  packet-foot: "6px"
  ballot-paper: "4px"
  pill: "99px"
  device: "28px"
  device-screen: "20px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
components:
  button-cast:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.white-label}"
    typography: "{typography.cast}"
    rounded: "{rounded.seed-packet}"
    padding: "8px 16px"
    height: "3.6rem"
  button-cast-ballot-paper:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white-label}"
    typography: "{typography.cast}"
    rounded: "{rounded.ballot-paper}"
    padding: "8px 16px"
    height: "3.6rem"
  choice-row:
    backgroundColor: "{colors.white-label}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.seed-packet}"
    padding: "12px 16px"
    height: "3.75rem"
  choice-row-hover:
    backgroundColor: "{colors.sprout-hover}"
  choice-row-selected:
    backgroundColor: "{colors.forest-ballot}"
    textColor: "{colors.white-label}"
  question-head:
    backgroundColor: "{colors.forest-ballot}"
    textColor: "{colors.white-label}"
    typography: "{typography.headline}"
    rounded: "{rounded.packet-head}"
    padding: "24px 24px 16px"
  facts-row:
    backgroundColor: "{colors.white-label}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "12px 16px"
  language-switch:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "2.75rem"
  language-switch-current:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.seed-paper}"
  receipt-code:
    textColor: "{colors.ink}"
    rounded: "{rounded.seed-packet}"
    padding: "16px"
---

# Design System: Qohesion

## Overview

**Creative North Star: "The Labelled Slip"**

Every screen is one small paper object with a clear label: the front of a seed packet, a ballot slip with its stub. A member should be able to point at the page and say what is being decided, when it closes, what counts as a pass and whether the ballot is secret, without reading anything else. The label says what the thing is before the interface asks anything of the reader.

Two templates paint the same structure. **Seed Packet** is the default: a colour block with a tab, a three-cell table of rules, large bordered rows, flat spot colour on a faintly green white. **Ballot Paper** is the second: a ruled white slip, a double rule under the question, circle marks that take an X, and a perforated stub that becomes the receipt. Tokens and component treatments differ between them. Layout, wording and behaviour do not. An organization picks a template and a brand colour, and the colour is checked for contrast before it is accepted.

The surface is calm and sparse on purpose. One question, one decision, nothing else on screen, administrators included. It is an operating surface for people who vote a few times a year, so familiar controls (radio rows, one submit button, a language switch) are kept and the brand shows in small precise details: the tab on the packet, the perforation on the slip, the dashed "tear here" rules. The system rejects the dashboard-with-a-form arrangement, dense tables, and houses or any other single-sector motif, because the product serves every kind of member-run group.

The website is a second surface and does not use the two templates. It keeps the navy of the landing page that stood in for it, and shows the templates only inside a frame that runs the real prototype. See "The Website" below.

**Key Characteristics:**
- One decision per screen, with the rules of the decision stated at the point of use.
- Flat paper surfaces: spot colour, 1.5px ink borders, dashed rules. No gradients, no blur.
- One saturated accent per screen, reserved for the act of casting.
- Touch targets of at least 44px, choice rows of 60px, a cast bar that stays reachable.
- Works without JavaScript and without any external request: fonts and icons are bundled.
- One language shown at a time, with a switcher; layouts hold the longer of French and English.

## Colors

Forest green and ink on a faintly green paper white, with one signal red kept for the act of casting.

### Primary
- **Forest Ballot** (#1F5C46): the default organization colour. It fills the question block and the selected choice in Seed Packet, and carries the focus ring, text selection, caret and the confirmation mark in both templates. Against white it reads at 7.8:1. An organization may replace it; the replacement must reach 4.5:1 against white text.

### Secondary
- **Signal Red** (#C63A22): the cast button in Seed Packet and nothing else. White text on it reads at 5.2:1. An organization may replace it; the replacement takes light or dark text, whichever reads better, and is darkened until it reaches 4.5:1. Ballot Paper has no accent colour: its cast button is Ink.

### Neutral
- **Ink** (#14151A): text, borders, the language switch and the Ballot Paper cast button.
- **White Label** (#FFFFFF): Seed Packet surfaces (rows, rules table).
- **Seed Paper** (#EEF3E9): Seed Packet page background. Ink on it reads at 16.2:1.
- **Sprout Hover** (#F6FAF2): hover on a Seed Packet row.
- **Moss Ink** (#3F4F45): secondary text on Seed Packet (notes, receipt line). 7.7:1 on Seed Paper.
- **Ledger Grey** (#E9E9E3): Ballot Paper page background.
- **Slip White** (#FBFBF8): the Ballot Paper slip.
- **Slip Hover** (#F1F1EC): hover and selected row on the slip.
- **Pencil Grey** (#4C4C47): secondary text on Ballot Paper. 7.1:1 on Ledger Grey.
- **Error Red** (#B3261E): error messages only, as bold text. 5.8:1 on Seed Paper.

### Named Rules
**The One Signal Rule.** Signal Red appears on one element per screen, the cast button. If a second thing wants to be red, it is not the vote.

**The Organization Colour Rule.** An organization changes the brand colour and the button colour, never the neutrals. The text colour on each is chosen by the system from white or ink, and a colour that cannot reach 4.5:1 is adjusted, with a message that says so. The prototype enforces this; the application will enforce it through the engine's colour question.

**The Fixed Ramp Rule.** Neutrals come from the short ramp above. A new grey is not invented for one component.

## Typography

**Display Font:** Figtree (with system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Figtree in Seed Packet; Public Sans in Ballot Paper (same fallbacks; token `body-ballot-paper`)
**Email Font:** the system sans stack (-apple-system, Segoe UI, Helvetica, Arial), because email clients do not load bundled fonts and the product makes no request to another site
**Code Font:** the system monospace stack (ui-monospace, SFMono-Regular, Menlo, Consolas), not bundled, for code spans in reading surfaces such as the changelog

**Character:** Round, open and heavy where it labels, plain where it explains. Weight carries the hierarchy (800 for the question and the cast button, 700 for labels and choices, 400 for explanation) more than size does. Both families are bundled as Latin variable subsets under the SIL Open Font License.

### Hierarchy
- **Display** (800, clamp(2rem, 9vw, 2.75rem), 1.05, -0.015em): the brand line on the home page only.
- **Headline** (800, clamp(1.6rem, 6.2vw, 2.05rem), 1.1, -0.01em): the question, in the label block. Balanced wrapping.
- **Title** (700, 1.15rem, 1.2): choice rows, the confirmation heading.
- **Cast** (800, 1.1rem, 1.2): the submit button.
- **Body** (400, 1rem, 1.45): the lede and general text. Tabular figures throughout, so quorums and dates align. Measure stays under 34rem.
- **Label** (700, 0.9rem): the names of the rules (Quorum, Passing rule, Ballot type), the language switch, the step numbers, the receipt label.
- **Note** (400, 0.88rem, 1.35): the one-sentence explanation under each rule, in Moss Ink or Pencil Grey.
- **Document** (400, 1rem, 1.6): long-form text on document pages. Section headings take the Headline's smallest size (1.6rem, 700), sub-headings the Title size (1.15rem, 700), and tables the Note size.
- **Receipt Code** (800, 1.5rem, 1.2, 0.12em): the receipt code on the confirmation screen, and nowhere else.
- **Small** (400, 0.85rem, 1.35): the footer and the development-preview line, in the secondary ink. Nothing else is smaller.

### Named Rules
**The Longer String Rule.** Every layout is tested with the French text, which runs longer. Nothing is sized to the English.

**The Weight Before Size Rule.** Emphasis comes from weight and position. A new size is not added to separate two things that weight can separate.

## Layout

A single centred column, 30rem (480px) wide at most, with a 16px gutter, on every screen size. There is no second column at desktop width: a vote is a phone-sized object and keeps its size. The stage fills the viewport height (100dvh), the footer sits at the foot of the stage, and the cast bar is sticky at the bottom of the form, padded for the device's safe area, so the button is always reachable on a tall question.

Spacing follows seven steps (4, 8, 12, 16, 24, 32, 48px). Groups are separated by space and by one hairline or dashed rule, never by boxes inside boxes. The first viewport at 390 by 844 holds the bar with the organization name and the language switch, the question block with the deadline, the three rules, three choice rows and the cast button. The bar, the main area and the footer are landmarks, with a skip link before them.

Breakpoints: none are needed for the voter screen. The column simply narrows below 480px.

## Elevation & Depth

Flat. Depth is conveyed by borders (1.5px Ink), colour blocks and the paper metaphor (a tab, a perforation), not by blur. Two shadows exist, both structural and both soft: one lifts the cast bar above scrolling content, one rests the Ballot Paper slip on the page.

### Shadow Vocabulary
- **Cast bar lift** (`box-shadow: 0 -10px 16px -12px rgba(20,21,26,.28)`): the bar over content that scrolls beneath it.
- **Slip rest** (`box-shadow: 0 18px 30px -22px rgba(20,21,26,.55)`): the Ballot Paper slip, a thin shadow under its lower edge.

### Named Rules
- **Device lift** (`box-shadow: 0 28px 48px -24px rgba(4,10,28,.7)`): the phone-sized frame that holds a live prototype on the website's night ground.

**The Paper Rule.** A surface is paper: flat, bordered or coloured. It does not glow, blur or float. A third shadow needs a structural reason, not a decorative one.

## Shapes

Seed Packet is soft and Ballot Paper is square. Seed Packet rows and the cast button take a 14px radius; its question block takes 22px on the top corners and 6px on the bottom (Packet Foot), with a 72 by 12px tab rising from the top edge. Ballot Paper takes 4px everywhere and uses straight rules, a 3px double rule under the question, and two 20px notches where the perforated stub meets the edges. Marks for choices are circles (1.7rem in Seed Packet, 2rem in Ballot Paper) with a 2px outline. The language switch is a pill (99px). Dashed rules (1.5px to 2px) mean a tear line: the dashed line above the receipt note and around the receipt code.

## Components

### Buttons
- **Shape:** the template's radius (14px Seed Packet, 4px Ballot Paper). Full width, 3.6rem tall at least.
- **Cast (primary):** Signal Red with white text in Seed Packet; Ink with white text in Ballot Paper. 1.1rem, 800 weight, centred. One per screen, in the sticky bar.
- **Hover / Focus:** hover darkens by a 7% brightness step over 150ms; press moves it down 1px. Focus is the 3px Forest Ballot ring with 3px offset, shown for keyboard focus only. A disabled button drops to half opacity and shows a not-allowed cursor.
- **Secondary:** a text link, underlined, with a 44px minimum target. There is no second button style.

### Choice rows
- **Style:** the whole row is the target: the real radio input covers it. White Label with a 1.5px Ink border and 14px radius in Seed Packet; ruled rows separated by 1px Ink lines on the slip in Ballot Paper (mark on the right, label on the left).
- **State:** hover is Sprout Hover (Slip Hover on the slip). Selected is Forest Ballot with white text and a white mark holding a green check in Seed Packet; on the slip it is Slip Hover with an X in the circle. Keyboard focus shows the ring on the row.
- **Size:** 60px high at least (68px on the slip), 1.15rem, 700 weight.

### Question block
- **Seed Packet:** a Forest Ballot block with a tab, the question in white at headline size, the lede, a dashed rule, then the step marks (numbered circles, the current one filled) and the deadline.
- **Ballot Paper:** the question on Slip White with a double rule beneath; step marks in Ink.

### Rules table (facts)
- **Style:** a definition list of three rows (quorum, passing rule, ballot type). Name at left in Label, value at right in bold, one Note sentence beneath that defines the term. White Label with a Forest Ballot border and rounded lower corners in Seed Packet; one Ink rule below on the slip.

### Language switch
- **Style:** a two-segment pill with a 1.5px Ink border. The current language is filled Ink with text in the page background colour; the other is transparent. Each segment is 44px at least, and is a plain link that works without JavaScript and reloads the page.

### Confirmation and receipt
- **Style:** a centred section with a 56px circle-and-check icon in Forest Ballot, a heading at 1.6rem (the Headline's smallest size), a short explanation, a label, and the receipt code in a 2px dashed box in the Receipt Code size (1.5rem, 800, 0.12em tracking). Focus moves to the heading when the section appears.

### Errors
- **Style:** one bold Error Red line above the receipt note, announced as an alert, with three parts in order: what happened, what it means, what to do.

### Footer and template links
- **Style:** Small text (0.85rem) in the secondary ink. Version, build and the source-code link sit in every footer. The template links above it take 44px targets.

## The Website
**Creative North Star: "The Ballot Room at Night"**

The website frames the product and does not wear its templates. It keeps the look of the navy landing page that has stood in for it since the first placeholder: a deep ground, light text, the lit logo. The two templates appear only where the product itself is shown, inside a phone-sized frame that runs the real prototype. The pages answer the questions of someone who has to run a vote for a group: what this is, what it looks like, what exists, what it costs, where the source is. Claims follow the functional register: a feature that does not exist is described as planned.

### Website colors
- **Night Navy** (#0F224C): the ground of every page.
- **Night Raised** (#17306A): raised surfaces, hover, the device frame, the heads of tables on the night ground.
- **Night Rule** (#3A5287): rules, frame borders, and secondary text on the paper sheet.
- **Mist** (#EAF2FF): text on the night ground, and the paper sheet that carries long text.
- **Mist Soft** (#C9D8F2): secondary text on the night ground; table heads, rules and code on the paper sheet.
- **Mist Dim** (#A9BEE6): tertiary text, and the outline of secondary buttons and of the language switch.
- **Mint** (#7FD1A4): the focus ring, the mark of the current page and the dashes of the receipt code. It marks interaction and nothing else.

**The Single Gradient Rule.** The logo's blue-to-cyan Q and green check are the only gradient on the site. No glow, no blurred shape, no gradient text.

Verified contrast: Mist on Night Navy 13.8:1, Mist Soft 10.8:1, Mist Dim 8.3:1, Mint 8.5:1. On Night Raised: Mist 11.2:1, Mist Soft 8.7:1, Mist Dim 6.7:1, Mint 6.9:1. On the paper sheet: Night Navy on Mist 13.8:1, Night Rule on Mist 6.8:1, Forest Ballot on Mist 7.0:1, Night Navy on Mist Soft 10.8:1.

### Website typography
- **Site Display** (Outfit 700, clamp(2.5rem, 8vw, 4.75rem), 1.02, -0.02em): the brand line on the home page.
- **Site Headline** (Figtree 800, clamp(1.6rem, 4.5vw, 2.4rem), 1.1, -0.01em): section headings on the home page and the title of every other page.
- **Site Lede** (400, 1.25rem, 1.5): the functional sentence under the brand line and the opening line of a page.
- **Site Name** (Outfit 600, 1.6rem, 1.15): the name of a mode in a ruled row.
- **Site Receipt** (Outfit 700, clamp(1.9rem, 8vw, 3.5rem), 1.1, 0.06em): the example receipt code.

Everything else takes the product scale: Document for running text, Title, Label, Note, Small and Code. Outfit is used for these three names only. The wordmark of the logo is Outfit Medium, and the placeholder set its tagline in the same face, so the brand line and the logo read as one lettering.

### Website layout
The masthead, the footer and the home sections share one 72rem container with a 16px gutter (24px from 44rem), so every block sits on the same left and right edges. Reading pages narrow to 52rem. Sections are separated by a Night Rule hairline and a vertical rhythm of 4rem to 6.5rem, and each fills one or two screens at 1440 by 900. The home page runs: hero, the two templates, the three modes, the ledger and its receipt, installation, cost. Cards of an icon, a heading and a line do not structure the page; rows, a frame and type do. Equal edges hold at 390, 768, 1024 and 1440.

### Website components
- **Masthead:** the dark logo lockup at 28px, the navigation (Pricing, Documentation), and the language switch. Links are Mist at 0.9rem, 700, 44px tall. The current page is underlined in Mint.
- **Hero:** the brand line in Site Display, the functional sentence in Site Lede, one status sentence in Mist Dim, one line of hard facts in Label size, and two actions: Mist fill with Night Navy text (primary), Mist Dim outline (secondary). The device frame stands to the right from 62rem and below the text under it. The hero enters once on load.
- **Device frame:** Night Raised with a 1.5px Night Rule border, a 28px radius and the Device lift shadow, holding an iframe of the real prototype with a 20px radius. The prototype runs in it. The frame carries no caption.
- **Ruled rows:** a name in Site Name on the left and its sentence on the right, between Night Rule hairlines, stacked under 44rem.
- **Receipt moment:** an example receipt code in Site Receipt, in groups joined by Mint dashes. Where the browser supports scroll-driven animation, each character comes into focus as the section enters the screen. Elsewhere, and under reduced motion, it rests in its final state.
- **Terminal panel:** Night Raised, 1.5px Night Rule, 14px radius, system monospace at 0.88rem, a Mint prompt, horizontally scrollable.
- **Paper sheet:** Mist with Night Navy text and a 14px radius, 52rem wide, for terms, name and logo, and documentation. Links are Forest Ballot and underlined. Rules and code take Mist Soft.
- **Tables:** a 1px frame with a 4px radius and the Note size, scrolling inside their own region with the first column kept in view. On the night ground the head is Night Raised and the rules Night Rule; on the paper sheet the head is Mist Soft and the frame Night Navy. A list of prices right-aligns the amount.
- **Footer:** the legal links, the licence, and the build, in Small size on the night ground, under a Night Rule hairline.

### Website motion
The hero enters once on load (700ms, ease-out, a 10px rise, staggered 80ms). Buttons step on hover (150ms) and press 1px. Links draw a thicker underline on hover. The receipt settles under scroll-driven animation, the one dealt moment of the home page. Nothing else moves because the page scrolled. Under reduced motion everything rests and nothing stays hidden.


## Do's and Don'ts

### Do:
- **Do** keep one question and one decision per screen, with its rules in the label block.
- **Do** reserve Signal Red for the cast button, once per screen.
- **Do** make the whole choice row the target and keep rows at 60px or taller.
- **Do** check every organization colour for 4.5:1 and say when it was adjusted.
- **Do** write messages in three parts: what happened, what it means, what to do.
- **Do** design with French first, the longer string, and show one language at a time.
- **Do** keep every control working without JavaScript and without a request to another site.
- **Do** keep bundled fonts and icons local, subsetted to Latin.

### Don't:
- **Don't** arrange a vote as a dashboard with a form in it, or put charts, tables or navigation around a ballot.
- **Don't** use a house, a building or any single-sector motif in the interface or the brand.
- **Don't** add gradients, blur, glow or a third shadow. The gradient belongs to the logo only.
- **Don't** dress the website in a template's paper, or the voting screen in the website's night. The templates are for voting; the navy is for the site that frames them.
- **Don't** celebrate: no confetti, no emotive copy, no exclamation marks on a recorded vote. The interface follows the functional register of `docs/content-style.md`.
- **Don't** use colour alone to carry meaning. A selected row also changes its mark, an error also has text.
- **Don't** invent a new grey, size or radius for one component. Use the ramp, the scale and the template's radius.
- **Don't** show both languages at once in the interface, other than through the switcher.
