// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The home page: its words in both languages, and the markup that carries them.
// Every claim here is checkable in the repository: the ledger tests, the install guide, the prototype.

import { escapeHtml, resolveHref } from "./lib.mjs";

const REPO = "https://github.com/msolav/qohesion";
/** Links are written as if the page sat in docs/, so that "pricing.md" finds the pricing page. */
export const HOME_PATH = "docs/_home.md";

export const HOME = {
  fr: {
    h1: "Décidons ensemble.",
    lede: "Qohesion est un logiciel libre pour tenir des votes et des sondages dans des groupes tels que des associations, des syndicats et des conseils.",
    status: "Le logiciel est en cours de développement. Aucun vote ne peut encore y être tenu.",
    facts: ["Pré-alpha 0.1.0", "Licence AGPL-3.0 ou ultérieure", "Français et anglais"],
    actions: { source: "Voir le code source", pricing: "Consulter les tarifs" },
    frames: { seed: "Aperçu de l’écran de vote, modèle Seed Packet", paper: "Aperçu de l’écran de vote, modèle Ballot Paper" },
    templates: {
      h2: "Deux modèles d’écran de vote",
      p: [
        "Chaque organisation choisit un modèle, ses couleurs et sa langue d’affichage. Seed Packet est un bloc de couleur avec de grands choix. Ballot Paper est un bulletin réglé avec un talon de reçu.",
        "Le contraste du texte est vérifié au niveau AA avant que les couleurs soient acceptées.",
      ],
      more: "Ouvrir l’aperçu en pleine page",
    },
    modes: {
      h2: "Trois modes d’utilisation prévus",
      intro: "Le même logiciel fonctionnera en trois modes.",
      rows: [
        ["Léger", "Sans compte. Un lien est partagé, puis chaque participant confirme son adresse courriel et vote. Pour les sondages et les consultations informels. Les bulletins sont supprimés à une date fixée après la fermeture."],
        ["Web complet", "Un compte pour l’organisation, avec la gestion des membres et des votes récurrents, sur le service hébergé."],
        ["Auto-hébergé", "Le logiciel est installé sur le serveur de l’organisation, qui envoie les courriels par son propre service."],
      ],
    },
    ledger: {
      h2: "Un code de reçu pour vérifier le décompte",
      p: [
        "Chaque bulletin enregistré donnera un code de reçu. Le registre des bulletins est une liste où l’on ne peut qu’ajouter, protégée par un arbre de Merkle (RFC 9162, SHA-256). Dans les tests, ses racines concordent avec les racines de référence de Certificate Transparency.",
        "Exemple de code de reçu, tiré des tests du registre. Un code ne révèle pas le choix exprimé.",
      ],
      code: "04HM-ASW9-NF6Y",
      after: "L’enregistrement des bulletins et le dépouillement ne sont pas encore écrits. Le choix d’une méthode de chiffrement vérifiée par des tiers précède leur écriture.",
    },
    install: {
      h2: "S’installer sur son propre serveur",
      p: [
        "L’image Docker s’exécute sans privilèges, avec un système de fichiers en lecture seule et sans capacité Linux. Elle ne fait aucun appel réseau autre que répondre aux requêtes: ni police externe, ni script externe, ni télémétrie.",
      ],
      command: "ORIGIN=https://vote.example.org docker compose up -d --build",
      excerpt: "extrait de compose.yml et du Dockerfile",
      after: "Le code est sous licence AGPL-3.0 ou ultérieure. Une version modifiée offerte en ligne doit offrir sa source à ses utilisateurs.",
      more: "Lire le guide d’installation (en anglais)",
    },
    cost: {
      h2: "Coût",
      p: "Le logiciel est gratuit et le restera. Le service hébergé sera gratuit pour les petits sondages, avec un forfait par scrutin au-delà. Les prix sont à l’état d’ébauche.",
      action: "Consulter les tarifs",
    },
  },
  en: {
    h1: "Decide together.",
    lede: "Qohesion is open-source software for holding votes and polls in groups such as associations, unions and councils.",
    status: "The software is under development. No vote can be held with it yet.",
    facts: ["Pre-alpha 0.1.0", "AGPL-3.0-or-later licence", "French and English"],
    actions: { source: "View the source code", pricing: "Read the pricing" },
    frames: { seed: "Ballot screen preview, Seed Packet template", paper: "Ballot screen preview, Ballot Paper template" },
    templates: {
      h2: "Two templates for the ballot screen",
      p: [
        "Each organization chooses a template, its colours and its display language. Seed Packet is a colour block with large choices. Ballot Paper is a ruled slip with a receipt stub.",
        "Text contrast is checked at level AA before the colours are accepted.",
      ],
      more: "Open the preview full page",
    },
    modes: {
      h2: "Three planned modes",
      intro: "The same software will run in three modes.",
      rows: [
        ["Light", "No account. A link is shared, then each participant confirms an email address and votes. For informal polls and consultations. Ballots are deleted on a set date after the poll closes."],
        ["Full web", "An account for the organization, with member management and recurring votes, on the hosted service."],
        ["Self-hosted", "The software is installed on the organization's own server, which sends email through its own service."],
      ],
    },
    ledger: {
      h2: "A receipt code to check the count",
      p: [
        "Each recorded ballot will give a receipt code. The ballot ledger is an append-only list protected by a Merkle tree (RFC 9162, SHA-256). In the tests, its roots match the Certificate Transparency reference roots.",
        "Example receipt code, taken from the ledger tests. A code does not reveal the choice made.",
      ],
      code: "04HM-ASW9-NF6Y",
      after: "Recording ballots and counting them are not written yet. Choosing an encryption method that third parties have audited comes before writing them.",
    },
    install: {
      h2: "Install on your own server",
      p: [
        "The Docker image runs without privileges, with a read-only file system and no Linux capabilities. It makes no network call other than answering requests: no external font, no external script, no telemetry.",
      ],
      command: "ORIGIN=https://vote.example.org docker compose up -d --build",
      excerpt: "excerpt of compose.yml and the Dockerfile",
      after: "The code is under the AGPL-3.0-or-later. A modified version offered online must offer its source to its users.",
      more: "Read the installation guide",
    },
    cost: {
      h2: "Cost",
      p: "The software is free and will stay free. The hosted service will be free for small polls, with an event pass beyond that. The prices are a draft.",
      action: "Read the pricing",
    },
  },
};

/** The hardening lines of compose.yml and the Dockerfile, as they are in the repository. */
export const HARDENING = ["ports:", '  - "127.0.0.1:3000:3000"', "read_only: true", "cap_drop: [ALL]", 'security_opt: ["no-new-privileges:true"]', "USER node"];

/** The receipt code as characters in groups, so that each can come into focus as the section enters the screen. */
function receiptMarkup(code) {
  let n = 0;
  const groups = code.split("-").map((group) => `<span class="g">${[...group].map((ch) => `<span class="c i${n++}">${escapeHtml(ch)}</span>`).join("")}</span>`);
  return `<p class="receipt"><span class="sr-only">${escapeHtml(code)}</span><span aria-hidden="true">${groups.join('<span class="d">-</span>')}</span></p>`;
}

/** Renders the whole home page, hero included, for one language. `out` is the page that carries it. */
export function renderHome({ lang, out, ctx }) {
  const t = HOME[lang];
  const href = (target) => escapeHtml(resolveHref(target, HOME_PATH, out, ctx));
  const seed = href("site:prototype");
  const paper = href("site:prototype-paper");

  return `<section class="hero enter" aria-labelledby="top-title">
<div>
<h1 id="top-title">${escapeHtml(t.h1)}</h1>
<p class="lede">${escapeHtml(t.lede)}</p>
<p class="status">${escapeHtml(t.status)}</p>
<ul class="facts">
${t.facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("\n")}
</ul>
<div class="actions">
<a class="btn primary" href="${escapeHtml(REPO)}">${escapeHtml(t.actions.source)}</a>
<a class="btn secondary" href="${href("pricing.md")}">${escapeHtml(t.actions.pricing)}</a>
</div>
</div>
<div class="device"><iframe src="${seed}" title="${escapeHtml(t.frames.seed)}"></iframe></div>
</section>

<section class="band" aria-labelledby="templates-title">
<div class="in split flip">
<div>
<h2 id="templates-title">${escapeHtml(t.templates.h2)}</h2>
${t.templates.p.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<p class="more"><a href="${paper}">${escapeHtml(t.templates.more)}</a></p>
</div>
<div class="device"><iframe src="${paper}" title="${escapeHtml(t.frames.paper)}" loading="lazy"></iframe></div>
</div>
</section>

<section class="band" aria-labelledby="modes-title">
<div class="in cols">
<h2 id="modes-title">${escapeHtml(t.modes.h2)}</h2>
<div>
<p>${escapeHtml(t.modes.intro)}</p>
<dl class="rows">
${t.modes.rows.map(([name, text]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(text)}</dd></div>`).join("\n")}
</dl>
</div>
</div>
</section>

<section class="band" aria-labelledby="ledger-title">
<div class="in cols">
<h2 id="ledger-title">${escapeHtml(t.ledger.h2)}</h2>
<div>
${t.ledger.p.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<div class="stub">
${receiptMarkup(t.ledger.code)}
</div>
<p>${escapeHtml(t.ledger.after)}</p>
</div>
</div>
</section>

<section class="band" aria-labelledby="install-title">
<div class="in cols">
<h2 id="install-title">${escapeHtml(t.install.h2)}</h2>
<div>
${t.install.p.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<div class="terminal"><code><span class="p" aria-hidden="true">$ </span>${escapeHtml(t.install.command)}

<span class="k"># ${escapeHtml(t.install.excerpt)}</span>
${HARDENING.map((line) => escapeHtml(line)).join("\n")}</code></div>
<p>${escapeHtml(t.install.after)}</p>
<p class="more"><a href="${href("install.md")}">${escapeHtml(t.install.more)}</a></p>
</div>
</div>
</section>

<section class="band" aria-labelledby="cost-title">
<div class="in cols">
<h2 id="cost-title">${escapeHtml(t.cost.h2)}</h2>
<div>
<p>${escapeHtml(t.cost.p)}</p>
<div class="actions">
<a class="btn primary" href="${href("pricing.md")}">${escapeHtml(t.cost.action)}</a>
</div>
</div>
</div>
</section>`;
}
