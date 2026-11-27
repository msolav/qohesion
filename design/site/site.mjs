// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// What the website holds: its pages, the words of its frame, and the groups of the documentation index.
// French is the default language and lives at the root; English lives under /en/.

export const LANGS = ["fr", "en"];

/** Pages of the website, in both languages. A page with a `source` is written in a document of docs/. */
export const PAGES = [
  {
    id: "home",
    slug: { fr: "", en: "" },
    title: { fr: "Accueil", en: "Home" },
    description: {
      fr: "Qohesion est un logiciel libre pour tenir des votes et des sondages dans des groupes tels que des associations, des syndicats et des conseils.",
      en: "Qohesion is open-source software for holding votes and polls in groups such as associations, unions and councils.",
    },
  },
  {
    id: "pricing",
    source: "docs/pricing.md",
    slug: { fr: "tarifs", en: "pricing" },
    title: { fr: "Tarifs", en: "Pricing" },
    description: {
      fr: "Les offres de Qohesion: gratuit pour les petits sondages, forfait par scrutin au-delà, ou auto-hébergement.",
      en: "The Qohesion offers: free for small polls, a poll pass beyond that, or self-hosting.",
    },
    surface: "night",
    wide: true,
    tableClasses: ["compare", "pricelist"],
  },
  {
    id: "terms",
    source: "docs/terms-of-use.md",
    slug: { fr: "conditions", en: "terms" },
    title: { fr: "Conditions d’utilisation", en: "Terms of use" },
    description: {
      fr: "Ébauche des conditions d’utilisation du service hébergé de Qohesion.",
      en: "Draft terms of use of the Qohesion hosted service.",
    },
    surface: "paper",
    footer: true,
  },
  {
    id: "brand",
    source: "docs/trademark-policy.md",
    slug: { fr: "marque", en: "brand" },
    title: { fr: "Nom et logo", en: "Name and logo" },
    description: {
      fr: "Ébauche de la politique relative au nom et au logo de Qohesion: usages permis et usages soumis à permission.",
      en: "Draft policy for the Qohesion name and logo: permitted uses and uses that need permission.",
    },
    surface: "paper",
    footer: true,
  },
];

/** Accounts of the project on other sites. Only accounts that exist are listed. */
export const SOCIAL = [
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/qohesion/" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/qohesion/" },
];

/** The words of the frame around the pages. */
export const STRINGS = {
  fr: {
    skip: "Passer au contenu",
    homeLabel: "Qohesion, accueil",
    navLabel: "Navigation principale",
    footLabel: "Liens de pied de page",
    langLabel: "Langue d’affichage",
    pricing: "Tarifs",
    docs: "Documentation (en anglais)",
    docsNav: "Documentation",
    sourceCode: "Code source",
    licence: "Qohesion est un logiciel libre sous licence AGPL-3.0 ou ultérieure.",
    scrollHint: "Faire défiler horizontalement pour voir toutes les offres.",
    notFound: "Page introuvable",
    notFoundText: "Cette adresse ne mène à aucune page de Qohesion.",
    notFoundBack: "Retour à l’accueil",
  },
  en: {
    skip: "Skip to content",
    homeLabel: "Qohesion, home",
    navLabel: "Main navigation",
    footLabel: "Footer links",
    langLabel: "Display language",
    pricing: "Pricing",
    docs: "Documentation",
    docsNav: "Documentation",
    sourceCode: "Source code",
    licence: "Qohesion is open-source software under the AGPL-3.0-or-later licence.",
    scrollHint: "Scroll sideways to see every offer.",
    notFound: "Page not found",
    notFoundText: "This address does not lead to a Qohesion page.",
    notFoundBack: "Back to the home page",
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
