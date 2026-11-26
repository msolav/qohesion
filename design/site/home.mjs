// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The home page: its words in both languages, and the markup that carries them.
// The copy is written as it reads when the offer is live. The preview is shown only behind its password.

import { escapeHtml, resolveHref } from "./lib.mjs";

const REPO = "https://github.com/msolav/qohesion";
const INSTAGRAM = "https://www.instagram.com/qohesion/";
/** Links are written as if the page sat in docs/, so that "pricing.md" finds the pricing page. */
export const HOME_PATH = "docs/_home.md";

/** The templates shown in the carousel. A new template is a new entry here and a new theme in the prototype. */
export const TEMPLATES = [
  { id: "ballot-paper", name: "Ballot Paper", text: { fr: "Un bulletin réglé, avec un talon de reçu.", en: "A ruled slip with a receipt stub." } },
  { id: "seed-packet", name: "Seed Packet", text: { fr: "Un bloc de couleur, avec de grands choix.", en: "A colour block with large choices." } },
];

/** The five steps of a vote, each with the glyph that draws it. Glyphs are authored here and shown beside their text. */
const GLYPHS = {
  roll: '<rect x="14" y="9" width="36" height="46" rx="4"/><path class="a" d="M22 23l3 3 5-6M22 35l3 3 5-6M22 47l3 3 5-6"/><path d="M35 24h9M35 36h9M35 48h9"/>',
  ballot: '<rect x="14" y="10" width="36" height="44" rx="4"/><circle cx="32" cy="29" r="9"/><path class="a" d="M27.5 29l3.2 3.2 5.8-6.4"/><path d="M23 47h18"/>',
  ledger: '<rect x="4" y="24" width="14" height="16" rx="3"/><rect x="25" y="24" width="14" height="16" rx="3"/><rect class="a" x="46" y="24" width="14" height="16" rx="3"/><path d="M18 32h7M39 32h7M46 48h14M46 54h9"/>',
  count: '<circle cx="14" cy="12" r="5"/><circle cx="32" cy="12" r="5"/><circle cx="50" cy="12" r="5"/><path d="M16 17l12 15M32 17v15M48 17l-12 15"/><rect x="22" y="33" width="20" height="21" rx="3"/><path d="M26 33v-4a6 6 0 0 1 12 0v4"/><circle class="a" cx="32" cy="43" r="2.5"/>',
  check: '<path d="M16 8h32v47l-5.3-4.2-5.4 4.2-5.3-4.2-5.4 4.2-5.3-4.2L16 55z"/><path class="a" d="M25 28l5.5 5.5L41 22"/><path d="M24 42h16"/>',
};
const STEPS = ["roll", "ballot", "ledger", "count", "check"];

export const HOME = {
  fr: {
    h1: "Décidons ensemble.",
    lede: "Qohesion est un logiciel libre pour tenir des votes et des sondages dans des groupes tels que des associations, des syndicats et des conseils.",
    facts: ["Logiciel libre", "Français et anglais", "Hébergé ou auto-hébergé"],
    actions: { pricing: "Consulter les tarifs", source: "Voir le code source" },
    frame: "Aperçu de l’écran de vote, modèle Seed Packet",
    templates: {
      h2: "Des modèles d’écran de vote",
      p: ["Chaque organisation choisit un modèle, ses couleurs et sa langue d’affichage.", "Le contraste du texte est vérifié au niveau AA avant que les couleurs soient acceptées."],
      region: "Modèles d’écran de vote",
      previous: "Modèle précédent",
      next: "Modèle suivant",
      frame: (name) => `Aperçu de l’écran de vote, modèle ${name}`,
      slide: (n, total, name) => `${n} sur ${total}: ${name}`,
      open: (name) => `Ouvrir ${name} en pleine page`,
    },
    modes: {
      h2: "Trois modes d’utilisation",
      intro: "Le même logiciel fonctionne en trois modes.",
      rows: [
        ["Léger", "Sans compte. Un lien est partagé, puis chaque participant confirme son adresse courriel et vote. Pour les sondages et les consultations informels. Les bulletins sont supprimés à une date fixée après la fermeture."],
        ["Web complet", "Un compte pour l’organisation, avec la gestion des membres et des votes récurrents, sur le service hébergé."],
        ["Auto-hébergé", "Le logiciel est installé sur le serveur de l’organisation, qui envoie les courriels par son propre service."],
      ],
    },
    safe: {
      h2: "Comment un vote reste secret et vérifiable",
      intro: "Cinq étapes, et aucune ne repose sur la confiance envers une seule personne.",
      steps: {
        roll: ["La liste des votants", "Les membres confirment eux-mêmes leur adresse. À la fin de l’inscription, la liste est figée et publiée sous forme d’un nombre et d’un code court.", "Personne ne peut ajouter ou retirer un votant sans que cela se voie."],
        ballot: ["Le bulletin", "Le bulletin enregistre le choix, jamais le nom du votant.", "Aucun lien ne relie un membre à son choix."],
        ledger: ["Le registre", "Chaque bulletin s’ajoute à une liste où l’on ne peut qu’ajouter, et son votant reçoit un code de reçu.", "Modifier une entrée change l’empreinte de toute la liste."],
        count: ["Le décompte", "Les administrateurs, qui détiennent chacun une part de la clé, ouvrent le décompte ensemble.", "Aucun administrateur seul ne peut lire un bulletin."],
        check: ["La vérification", "Le résultat est publié avec le registre. Un code de reçu prouve qu’un bulletin s’y trouve.", "Chacun peut vérifier, sans faire confiance à l’hébergeur."],
      },
      close: "Chaque étape peut être vérifiée par une autre personne que l’hébergeur. Le code est libre, et une organisation peut l’exécuter sur son propre serveur.",
    },
    ledger: {
      h2: "Un code de reçu pour vérifier le décompte",
      p: [
        "Chaque bulletin enregistré donne un code de reçu. Le registre est une liste où l’on ne peut qu’ajouter, fondée sur l’arbre de Merkle de la RFC 9162, le format des journaux de Certificate Transparency, avec SHA-256.",
        "Exemple de code de reçu. Un code ne révèle jamais le choix exprimé.",
      ],
      code: "04HM-ASW9-NF6Y",
      after: "Le membre garde son code et vérifie plus tard que son bulletin figure dans le décompte publié.",
    },
    install: {
      h2: "S’installer sur son propre serveur",
      p: [
        "L’image Docker s’exécute sans privilèges, avec un système de fichiers en lecture seule et sans capacité Linux. Elle ne fait aucun appel réseau autre que répondre aux requêtes: ni police externe, ni script externe, ni télémétrie.",
        "Le code est sous licence AGPL-3.0 ou ultérieure. Une version modifiée offerte en ligne doit offrir sa source à ses utilisateurs.",
      ],
      command: "ORIGIN=https://vote.example.org docker compose up -d --build",
      excerpt: "extrait de compose.yml et du Dockerfile",
      more: "Lire le guide d’installation (en anglais)",
    },
    cost: {
      h2: "Coût",
      p: "Le logiciel est gratuit. Le service hébergé est gratuit pour les petits sondages, avec un forfait par scrutin au-delà.",
      action: "Consulter les tarifs",
      follow: "Instagram",
    },
  },
  en: {
    h1: "Decide together.",
    lede: "Qohesion is open-source software for holding votes and polls in groups such as associations, unions and councils.",
    facts: ["Open source", "French and English", "Hosted or self-hosted"],
    actions: { pricing: "Read the pricing", source: "View the source code" },
    frame: "Ballot screen preview, Seed Packet template",
    templates: {
      h2: "Ballot screen templates",
      p: ["Each organization chooses a template, its colours and its display language.", "Text contrast is checked at level AA before the colours are accepted."],
      region: "Ballot screen templates",
      previous: "Previous template",
      next: "Next template",
      frame: (name) => `Ballot screen preview, ${name} template`,
      slide: (n, total, name) => `${n} of ${total}: ${name}`,
      open: (name) => `Open ${name} full page`,
    },
    modes: {
      h2: "Three modes of use",
      intro: "The same software runs in three modes.",
      rows: [
        ["Light", "No account. A link is shared, then each participant confirms an email address and votes. For informal polls and consultations. Ballots are deleted on a set date after the poll closes."],
        ["Full web", "An account for the organization, with member management and recurring votes, on the hosted service."],
        ["Self-hosted", "The software is installed on the organization's own server, which sends email through its own service."],
      ],
    },
    safe: {
      h2: "How a vote stays secret and checkable",
      intro: "Five steps, and none relies on trusting one person.",
      steps: {
        roll: ["The roll", "Members confirm their own address. When registration closes, the roll is frozen and published as a count and a short code.", "Nobody can add or remove a voter without it showing."],
        ballot: ["The ballot", "The ballot records the choice, never the voter's name.", "No link joins a member to a choice."],
        ledger: ["The ledger", "Each ballot joins a list that can only be added to, and its voter gets a receipt code.", "Altering an entry changes the fingerprint of the whole list."],
        count: ["The count", "Administrators who each hold a share of the key open the count together.", "No single administrator can read a ballot."],
        check: ["The check", "The result is published with the ledger. A receipt code proves a ballot is in it.", "Anyone can check, without trusting the host."],
      },
      close: "Every step can be checked by someone other than the host. The code is open, and an organization can run it on its own server.",
    },
    ledger: {
      h2: "A receipt code to check the count",
      p: [
        "Each recorded ballot gives a receipt code. The ledger is an append-only list built on the Merkle tree of RFC 9162, the format of Certificate Transparency logs, with SHA-256.",
        "Example receipt code. A code never reveals the choice made.",
      ],
      code: "04HM-ASW9-NF6Y",
      after: "The member keeps the code and checks later that the ballot is in the published count.",
    },
    install: {
      h2: "Install on your own server",
      p: [
        "The Docker image runs without privileges, with a read-only file system and no Linux capabilities. It makes no network call other than answering requests: no external font, no external script, no telemetry.",
        "The code is under the AGPL-3.0-or-later. A modified version offered online must offer its source to its users.",
      ],
      command: "ORIGIN=https://vote.example.org docker compose up -d --build",
      excerpt: "excerpt of compose.yml and the Dockerfile",
      more: "Read the installation guide",
    },
    cost: {
      h2: "Cost",
      p: "The software is free. The hosted service is free for small polls, with an event pass beyond that.",
      action: "Read the pricing",
      follow: "Instagram",
    },
  },
};

/** The hardening lines of compose.yml and the Dockerfile, as they are in the repository. */
export const HARDENING = ["ports:", '  - "127.0.0.1:3000:3000"', "read_only: true", "cap_drop: [ALL]", 'security_opt: ["no-new-privileges:true"]', "USER node"];

/** The receipt code as characters in groups that cannot break apart, so that each character can come into focus. */
function receiptMarkup(code) {
  let n = 0;
  const groups = code.split("-").map((group) => `<span class="g">${[...group].map((ch) => `<span class="c i${n++}">${escapeHtml(ch)}</span>`).join("")}</span>`);
  return `<p class="receipt"><span class="sr-only">${escapeHtml(code)}</span><span class="code" aria-hidden="true">${groups.join('<span class="d">-</span>')}</span></p>`;
}

const chevron = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;

/** Renders the whole home page, hero included, for one language. `out` is the page that carries it. */
export function renderHome({ lang, out, ctx }) {
  const t = HOME[lang];
  const href = (target) => escapeHtml(resolveHref(target, HOME_PATH, out, ctx));

  const slides = TEMPLATES.map((tpl, i) => {
    const label = t.templates.slide(i + 1, TEMPLATES.length, tpl.name);
    return `<li class="slide" data-slide role="group" aria-roledescription="slide" aria-label="${escapeHtml(label)}">
<div class="slide-head"><h3>${escapeHtml(tpl.name)}</h3>
<p>${escapeHtml(tpl.text[lang])}</p></div>
<div class="device"><iframe src="${href(`site:prototype-${tpl.id}-embed`)}" title="${escapeHtml(t.templates.frame(tpl.name))}" loading="lazy"></iframe></div>
<p class="more"><a href="${href(`site:prototype-${tpl.id}`)}">${escapeHtml(t.templates.open(tpl.name))}</a></p>
</li>`;
  }).join("\n");

  const steps = STEPS.map((id) => {
    const [name, what, why] = t.safe.steps[id];
    return `<li><svg class="glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${GLYPHS[id]}</svg><h3>${escapeHtml(name)}</h3><p>${escapeHtml(what)}</p><p class="why">${escapeHtml(why)}</p></li>`;
  }).join("\n");

  return `<section class="hero enter" aria-labelledby="top-title">
<div>
<h1 id="top-title">${escapeHtml(t.h1)}</h1>
<p class="lede">${escapeHtml(t.lede)}</p>
<ul class="facts">
${t.facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("\n")}
</ul>
<div class="actions">
<a class="btn primary" href="${href("pricing.md")}">${escapeHtml(t.actions.pricing)}</a>
<a class="btn secondary" href="${escapeHtml(REPO)}">${escapeHtml(t.actions.source)}</a>
</div>
</div>
<div class="device"><iframe src="${href("site:prototype-embed")}" title="${escapeHtml(t.frame)}"></iframe></div>
</section>

<section class="band" aria-labelledby="templates-title">
<div class="in cols">
<div>
<h2 id="templates-title">${escapeHtml(t.templates.h2)}</h2>
${t.templates.p.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
</div>
<div class="carousel" data-carousel role="group" aria-roledescription="carousel" aria-label="${escapeHtml(t.templates.region)}">
<div class="car-controls" data-controls hidden>
<button type="button" class="car-btn" data-prev aria-label="${escapeHtml(t.templates.previous)}">${chevron("M15 5l-7 7 7 7")}</button>
<button type="button" class="car-btn" data-next aria-label="${escapeHtml(t.templates.next)}">${chevron("M9 5l7 7-7 7")}</button>
</div>
<ul class="track" data-track tabindex="0" aria-label="${escapeHtml(t.templates.region)}">
${slides}
</ul>
</div>
</div>
</section>

<section class="band" aria-labelledby="modes-title">
<div class="in">
<h2 id="modes-title">${escapeHtml(t.modes.h2)}</h2>
<p>${escapeHtml(t.modes.intro)}</p>
<dl class="modes">
${t.modes.rows.map(([name, text]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(text)}</dd></div>`).join("\n")}
</dl>
</div>
</section>

<section class="band" aria-labelledby="safe-title">
<div class="in">
<h2 id="safe-title">${escapeHtml(t.safe.h2)}</h2>
<p>${escapeHtml(t.safe.intro)}</p>
<ol class="flow">
${steps}
</ol>
<p class="closing">${escapeHtml(t.safe.close)}</p>
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
<div class="in">
<div class="cols">
<h2 id="install-title">${escapeHtml(t.install.h2)}</h2>
<div>
${t.install.p.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<p class="more"><a href="${href("install.md")}">${escapeHtml(t.install.more)}</a></p>
</div>
</div>
<div class="terminal"><code><span class="p" aria-hidden="true">$ </span>${escapeHtml(t.install.command)}

<span class="k"># ${escapeHtml(t.install.excerpt)}</span>
${HARDENING.map((line) => escapeHtml(line)).join("\n")}</code></div>
</div>
</section>

<section class="band" aria-labelledby="cost-title">
<div class="in cost">
<h2 id="cost-title">${escapeHtml(t.cost.h2)}</h2>
<p>${escapeHtml(t.cost.p)}</p>
<div class="actions">
<a class="btn primary" href="${href("pricing.md")}">${escapeHtml(t.cost.action)}</a>
<a class="btn secondary" href="${escapeHtml(INSTAGRAM)}">${escapeHtml(t.cost.follow)}</a>
</div>
</div>
</section>`;
}
