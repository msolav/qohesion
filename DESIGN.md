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
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Figtree, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "2.05rem"
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
  body-ballot-paper:
    fontFamily: "'Public Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum'"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.88em"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  seed-packet: "14px"
  packet-head: "22px"
  packet-tab: "8px"
  ballot-paper: "4px"
  pill: "99px"
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
**Code Font:** the system monospace stack (ui-monospace, SFMono-Regular, Menlo, Consolas), not bundled, for code spans in reading surfaces such as the changelog

**Character:** Round, open and heavy where it labels, plain where it explains. Weight carries the hierarchy (800 for the question and the cast button, 700 for labels and choices, 400 for explanation) more than size does. Both families are bundled as Latin variable subsets under the SIL Open Font License.

### Hierarchy
- **Display** (800, clamp(2rem, 9vw, 2.75rem), 1.05, -0.015em): the brand line on the home page only.
- **Headline** (800, clamp(1.6rem, 6.2vw, 2.05rem), 1.1, -0.01em): the question, in the label block. Balanced wrapping.
- **Title** (700, 1.15rem, 1.2): choice rows, the confirmation heading.
- **Cast** (800, 1.1rem, 1.2): the submit button.
- **Body** (400, 1rem, 1.45): the lede and general text. Tabular figures throughout, so quorums and dates align. Measure stays under 34rem.
- **Label** (700, 0.9rem): the names of the rules (Quorum, Passing rule, Ballot type), the language switch, the receipt label.
- **Note** (400, 0.88rem, 1.35): the one-sentence explanation under each rule, in Moss Ink or Pencil Grey.

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
**The Paper Rule.** A surface is paper: flat, bordered or coloured. It does not glow, blur or float. A third shadow needs a structural reason, not a decorative one.

## Shapes

Seed Packet is soft and Ballot Paper is square. Seed Packet rows and the cast button take a 14px radius; its question block takes 22px on the top corners and 6px on the bottom, with a 72 by 12px tab rising from the top edge. Ballot Paper takes 4px everywhere and uses straight rules, a 3px double rule under the question, and two 20px notches where the perforated stub meets the edges. Marks for choices are circles (1.7rem in Seed Packet, 2rem in Ballot Paper) with a 2px outline. The language switch is a pill (99px). Dashed rules (1.5px to 2px) mean a tear line: the dashed line above the receipt note and around the receipt code.

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
- **Style:** a centred section with a 56px circle-and-check icon in Forest Ballot, a Title-sized heading, a short explanation, a label, and the receipt code in a 2px dashed box at 1.5rem, 800 weight, widely spaced. Focus moves to the heading when the section appears.

### Errors
- **Style:** one bold Error Red line above the receipt note, announced as an alert, with three parts in order: what happened, what it means, what to do.

### Footer and template links
- **Style:** small text (0.85rem) in the secondary ink. Version, build and the source-code link sit in every footer. The template links above it take 44px targets.

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
- **Don't** celebrate: no confetti, no emotive copy, no exclamation marks on a recorded vote. The interface follows the functional register of `docs/content-style.md`.
- **Don't** use colour alone to carry meaning. A selected row also changes its mark, an error also has text.
- **Don't** invent a new grey, size or radius for one component. Use the ramp, the scale and the template's radius.
- **Don't** show both languages at once in the interface, other than through the switcher.
