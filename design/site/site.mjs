// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// What the website holds: its pages, the words of its frame, and the groups of the documentation index.

export const LANGS = ["fr", "en"];

/** Pages of the website, in both languages. A page with a `source` is written in a document of docs/. */
export const PAGES = [
  {
    id: "home",
    content: "design/site/content/home",
    slug: { fr: "", en: "" },
    title: { fr: "Accueil", en: "Home" },
    tableClasses: ["facts"],
    actions: [
      { kind: "primary", label: { fr: "Voir l’aperçu de l’écran de vote", en: "See the ballot screen preview" }, href: "site:prototype" },
      { kind: "secondary", label: { fr: "Consulter les tarifs", en: "Read the pricing" }, href: "pricing.md" },
    ],
  },
  {
    id: "pricing",
    source: "docs/pricing.md",
    slug: { fr: "tarifs", en: "pricing" },
    title: { fr: "Tarifs (ébauche)", en: "Pricing (draft)" },
    nav: true,
    wide: true,
    tableClasses: ["compare", "pricelist"],
  },
  {
    id: "terms",
    source: "docs/terms-of-use.md",
    slug: { fr: "conditions", en: "terms" },
    title: { fr: "Conditions d’utilisation", en: "Terms of use" },
    footer: true,
  },
  {
    id: "brand",
    source: "docs/trademark-policy.md",
    slug: { fr: "marque", en: "brand" },
    title: { fr: "Nom et logo", en: "Name and logo" },
    footer: true,
  },
];

/** The words of the frame around the pages. */
export const STRINGS = {
  fr: {
    skip: "Passer au contenu",
    homeLabel: "Qohesion, accueil",
    navLabel: "Navigation principale",
    langLabel: "Langue d’affichage",
    notice: "Version de travail. Le contenu peut changer avant la publication.",
    pricing: "Tarifs",
    docs: "Documentation (en anglais)",
    docsNav: "Documentation",
    sourceCode: "Code source",
    built: "Construit à partir de",
    pageSource: "Source de cette page",
    docsIndexSource: "Documents dans le dépôt",
  },
  en: {
    skip: "Skip to content",
    homeLabel: "Qohesion, home",
    navLabel: "Main navigation",
    langLabel: "Display language",
    notice: "Working version. The content can change before release.",
    pricing: "Pricing",
    docs: "Documentation",
    docsNav: "Documentation",
    sourceCode: "Source code",
    built: "Built from",
    pageSource: "Source of this page",
    docsIndexSource: "Documents in the repository",
  },
};

/** Documentation: English only. The pages above are not repeated in it. */
export const DOC_GROUPS = [
  { title: "Policies and plans", docs: ["docs/privacy.md", "docs/legal-review-brief.md"] },
  { title: "Product and writing", docs: ["docs/glossary.md", "docs/content-style.md", "docs/install.md", "docs/threat-model.md", "docs/templates/README.md"] },
  { title: "Decisions", prefix: "docs/adr/" },
];

export const DOC_DESCRIPTIONS = {
  "docs/privacy.md": "Approach to Law 25 (Quebec) and the GDPR.",
  "docs/legal-review-brief.md": "Questions for legal counsel before the hosted service opens.",
  "docs/glossary.md": "Terms used in the interface and the documents, with the French form.",
  "docs/content-style.md": "Rules for the wording of the interface, emails and documents.",
  "docs/install.md": "Installing the application with Docker Compose.",
  "docs/threat-model.md": "What the software protects against, and what depends on trusting an administrator.",
  "docs/templates/README.md": "Fill-in templates for organizations that install the software.",
};

/** Documentation pages that hold wide tables. */
export const WIDE_DOCS = new Set(["docs/glossary.md", "docs/adr/0006-pricing-and-limits.md"]);
