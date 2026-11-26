// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Text of the test edition: the owner and administrator screens, and the voter screens of real polls.
 * Functional register (docs/content-style.md). French and English have the same keys; the type enforces it.
 */

import type { Locale } from "./negotiate";
import type { ResultsAudience, ResultsTiming } from "../results-rules";

interface Names<K extends string> {
  readonly title: Readonly<Record<K, string>>;
  readonly text: Readonly<Record<K, string>>;
}

export interface ConsoleMessages {
  readonly edition: { readonly label: string; readonly text: string };
  readonly nav: { readonly label: string; readonly polls: string; readonly space: string; readonly signOut: string; readonly signIn: string; readonly start: string };
  readonly common: {
    readonly save: string; readonly cancel: string; readonly back: string; readonly copy: string; readonly copied: string; readonly delete: string;
    readonly open: string; readonly close: string; readonly none: string; readonly yes: string; readonly no: string; readonly optional: string;
  };
  readonly status: Readonly<Record<"draft" | "open" | "closed", string>>;
  readonly member: Readonly<Record<"listed" | "requested" | "confirmed" | "voted" | "withdrawn" | "bounced" | "blocked", string>>;
  readonly role: { readonly owner: string; readonly administrator: string; readonly both: string };
  readonly start: {
    readonly title: string; readonly lede: string; readonly name: string; readonly language: string; readonly submit: string; readonly haveKey: string;
    readonly keyTitle: string; readonly keyText: string; readonly keyLabel: string; readonly keyWarning: string; readonly keyContinue: string; readonly download: string;
  };
  readonly signin: { readonly title: string; readonly lede: string; readonly key: string; readonly hint: string; readonly submit: string; readonly invalid: string; readonly tooMany: string; readonly noSpace: string; readonly create: string };
  readonly polls: {
    readonly title: string; readonly empty: string; readonly emptyText: string; readonly create: string; readonly roll: string; readonly ballots: string; readonly opened: string; readonly closes: string; readonly noPolls: string;
  };
  readonly form: {
    readonly newTitle: string; readonly editTitle: string; readonly question: string; readonly questionHelp: string; readonly details: string; readonly detailsHelp: string;
    readonly kind: string; readonly kindYesNo: string; readonly kindYesNoText: string; readonly kindChoice: string; readonly kindChoiceText: string;
    readonly options: string; readonly optionsHelp: string; readonly optionN: string; readonly addOption: string;
    readonly results: string; readonly resultsHelp: string; readonly timing: string; readonly audience: string; readonly timingNames: Names<ResultsTiming>; readonly audienceNames: Names<ResultsAudience>;
    readonly template: string; readonly templateSeed: string; readonly templateBallot: string;
    readonly duration: string; readonly durationManual: string; readonly durationHours: string; readonly durationHelp: string;
    readonly preview: string; readonly locked: string; readonly create: string; readonly smallRoll: string;
  };
  readonly poll: {
    readonly overview: string; readonly roll: string; readonly results: string; readonly history: string;
    readonly facts: string; readonly rollCount: string; readonly rollCode: string; readonly rollCodeNote: string; readonly voted: string; readonly turnout: string;
    readonly openedAt: string; readonly closesAt: string; readonly closedAt: string; readonly manual: string;
    readonly openNow: string; readonly openNote: string; readonly openNeedsRoll: string; readonly closeNow: string; readonly closeNote: string; readonly deletePoll: string; readonly confirmDelete: string; readonly confirmOpen: string; readonly confirmClose: string;
    readonly edit: string; readonly draftNote: string; readonly openNote2: string; readonly closedNote: string;
    readonly settings: string; readonly resultsRule: string;
  };
  readonly roll: {
    readonly title: string; readonly add: string; readonly addHelp: string; readonly addPlaceholder: string; readonly addSubmit: string;
    readonly added: string; readonly duplicates: string; readonly rejected: string; readonly reasonInvalid: string; readonly reasonDisposable: string;
    readonly address: string; readonly status: string; readonly link: string; readonly late: string; readonly remove: string; readonly empty: string;
    readonly linksTitle: string; readonly linksText: string; readonly copyLink: string; readonly copyAll: string; readonly lateNote: string; readonly votedNote: string; readonly day: string;
  };
  readonly results: {
    readonly title: string; readonly live: string; readonly updated: string; readonly updating: string; readonly turnout: string; readonly of: string; readonly votes: string; readonly total: string;
    readonly hiddenTitle: string; readonly hiddenText: string; readonly hiddenAdminText: string; readonly notAllowedTitle: string; readonly notAllowedText: string;
    readonly finalTitle: string; readonly ledger: string; readonly ledgerText: string; readonly root: string; readonly size: string; readonly receipts: string;
    readonly check: string; readonly checkHelp: string; readonly checkSubmit: string; readonly checkFound: string; readonly checkNotFound: string; readonly checkPosition: string; readonly checkProof: string;
    readonly ledgerNotYet: string; readonly share: string; readonly winner: string; readonly tie: string; readonly noBallots: string;
  };
  readonly history: { readonly title: string; readonly empty: string; readonly actions: Readonly<Record<string, string>> };
  readonly space: {
    readonly title: string; readonly settings: string; readonly name: string; readonly language: string; readonly template: string; readonly save: string; readonly saved: string;
    readonly keys: string; readonly keysText: string; readonly keyLabel: string; readonly keyRoles: string; readonly addKey: string; readonly createKey: string; readonly revoke: string; readonly revoked: string; readonly confirmRevoke: string; readonly you: string;
    readonly newKeyTitle: string; readonly newKeyText: string; readonly danger: string; readonly dangerText: string; readonly confirmName: string; readonly deleteSpace: string;
  };
  readonly voter: {
    readonly lede: string; readonly facts: string; readonly closes: string; readonly noClose: string; readonly roll: string; readonly rollValue: string; readonly rollNote: string; readonly results: string;
    readonly ballotType: string; readonly ballotValue: string; readonly ballotNote: string; readonly submit: string; readonly legend: string; readonly problem: string;
    readonly doneTitle: string; readonly doneText: string; readonly doneLabel: string; readonly doneNote: string; readonly doneResults: string;
    readonly votedTitle: string; readonly votedText: string; readonly closedTitle: string; readonly closedText: string; readonly notOpenTitle: string; readonly notOpenText: string;
    readonly unknownTitle: string; readonly unknownText: string; readonly seeResults: string; readonly publicResults: string;
  };
  readonly resultsStatement: Readonly<Record<ResultsTiming, Readonly<Record<ResultsAudience, string>>>>;
  readonly errors: Readonly<Record<string, string>>;
}

const en: ConsoleMessages = {
  edition: {
    label: "Test edition",
    text: "Ballots are stored without encryption and data may be erased. Do not use it for decisions that need a secret ballot.",
  },
  nav: { label: "Administration", polls: "Polls", space: "Organization", signOut: "Sign out", signIn: "Sign in", start: "Create an organization" },
  common: { save: "Save", cancel: "Cancel", back: "Back", copy: "Copy", copied: "Copied", delete: "Delete", open: "Open", close: "Close", none: "None", yes: "Yes", no: "No", optional: "optional" },
  status: { draft: "Draft", open: "Open", closed: "Closed" },
  member: { listed: "Listed", requested: "Requested", confirmed: "Confirmed", voted: "Voted", withdrawn: "Withdrawn", bounced: "Bounced", blocked: "Blocked" },
  role: { owner: "Owner", administrator: "Administrator", both: "Owner and administrator" },
  start: {
    title: "Create an organization",
    lede: "An organization holds polls, administrators and members. Creating one gives a key that signs in as owner and administrator.",
    name: "Name of the organization",
    language: "Language of the interface",
    submit: "Create the organization",
    haveKey: "Already have a key? Sign in",
    keyTitle: "Keep this key",
    keyText: "The key signs in to this organization. It is shown once and is not stored in a readable form, so it cannot be recovered. Another owner can create a new key.",
    keyLabel: "Key",
    keyWarning: "Anyone who has the key can sign in as owner and administrator.",
    keyContinue: "I have saved the key. Continue",
    download: "Download as a text file",
  },
  signin: {
    title: "Sign in",
    lede: "Enter the key of an owner or an administrator.",
    key: "Key",
    hint: "Format: QK-XXXXXX-XXXXXX-XXXXXX-XXXXXX. Capital letters and hyphens do not matter.",
    submit: "Sign in",
    invalid: "This key is not valid or has been revoked. Check it and try again.",
    tooMany: "Too many attempts. Wait a few minutes and try again.",
    noSpace: "No organization yet?",
    create: "Create an organization",
  },
  polls: {
    title: "Polls",
    empty: "No poll yet",
    emptyText: "A poll is a question put to the members. Create one, add the addresses of the members, then open it.",
    create: "New poll",
    roll: "Roll",
    ballots: "Ballots",
    opened: "Opened",
    closes: "Closes",
    noPolls: "This key has the owner role only. Polls are run with an administrator key.",
  },
  form: {
    newTitle: "New poll",
    editTitle: "Edit the poll",
    question: "Question",
    questionHelp: "The text members read at the top of the ballot.",
    details: "Details",
    detailsHelp: "Context shown under the question. For example the amount, the deadline or where to read the proposal.",
    kind: "Type of question",
    kindYesNo: "In favour, against, abstention",
    kindYesNoText: "A proposal to adopt or reject. Three fixed choices.",
    kindChoice: "One choice among several",
    kindChoiceText: "Members choose one option from a list you write.",
    options: "Options",
    optionsHelp: "Two to twelve options. Empty lines are ignored.",
    optionN: "Option {n}",
    addOption: "Add an option",
    results: "Results",
    resultsHelp: "Decided before opening and shown to members on the ballot. It cannot be changed once the poll is open.",
    timing: "When results are shown",
    audience: "Who sees the results",
    timingNames: {
      title: { close: "When the poll closes", live: "As ballots arrive" },
      text: { close: "Nobody sees totals before the close, administrators included. This is the usual secret-ballot rule.", live: "Totals and turnout update in real time for the chosen audience while voting is open." },
    },
    audienceNames: {
      title: { administrators: "Administrators", voters: "Members on the roll", anyone: "Anyone with the address" },
      text: { administrators: "Only people signed in with an administrator key.", voters: "Anyone who holds a personal voting link.", anyone: "A public results page. No sign-in." },
    },
    template: "Ballot template",
    templateSeed: "Seed Packet",
    templateBallot: "Ballot Paper",
    duration: "Closing",
    durationManual: "An administrator closes the poll",
    durationHours: "Closes by itself after a number of hours",
    durationHelp: "Counted from the moment the poll opens. Between 1 and 720 hours.",
    preview: "What members see",
    locked: "The results settings and the options are fixed once the poll is open.",
    create: "Create the poll",
    smallRoll: "With a small roll, live totals can reveal how a person voted. Fewer than 5 addresses are on the roll.",
  },
  poll: {
    overview: "Overview",
    roll: "Roll",
    results: "Results",
    history: "History",
    facts: "At a glance",
    rollCount: "On the roll",
    rollCode: "Roll code",
    rollCodeNote: "Identifies the exact list of addresses at the moment the poll opened.",
    voted: "Voted",
    turnout: "Turnout",
    openedAt: "Opened",
    closesAt: "Closes",
    closedAt: "Closed",
    manual: "When an administrator closes it",
    openNow: "Open the poll",
    openNote: "Opening freezes the roll and its code, and fixes the options and the results settings. Members can then vote with their links.",
    openNeedsRoll: "Add at least one address to the roll before opening.",
    closeNow: "Close the poll",
    closeNote: "Closing ends voting and publishes the final results to the chosen audience.",
    deletePoll: "Delete the draft",
    confirmDelete: "Delete this draft and its roll?",
    confirmOpen: "Open the poll now? The roll and the settings cannot be changed afterwards.",
    confirmClose: "Close the poll now? Voting ends and cannot resume.",
    edit: "Edit",
    draftNote: "Draft. Nobody can vote yet.",
    openNote2: "Voting is open.",
    closedNote: "Voting has ended.",
    settings: "Settings",
    resultsRule: "Results",
  },
  roll: {
    title: "Roll",
    add: "Add addresses",
    addHelp: "One address per line, or separated by commas or semicolons. Up to 200 per poll.",
    addPlaceholder: "name@example.org",
    addSubmit: "Add to the roll",
    added: "{n} added.",
    duplicates: "{n} already on the roll.",
    rejected: "Not added:",
    reasonInvalid: "not a valid address",
    reasonDisposable: "a disposable address service",
    address: "Address",
    status: "Status",
    link: "Personal link",
    late: "Added late",
    remove: "Remove",
    empty: "No address yet.",
    linksTitle: "Personal links",
    linksText: "Each member votes with their own link. In the test edition nothing is sent by email: copy each link and send it yourself. A link works once.",
    copyLink: "Copy link",
    copyAll: "Copy all links",
    lateNote: "Added after the poll opened. Shown here so that everyone can see the roll changed.",
    votedNote: "Shows that a ballot was cast, never which one.",
    day: "Day voted",
  },
  results: {
    title: "Results",
    live: "Live",
    updated: "Updated",
    updating: "Updating",
    turnout: "Ballots cast",
    of: "of",
    votes: "votes",
    total: "Total",
    hiddenTitle: "Results are not shown yet",
    hiddenText: "Totals appear when the poll closes.",
    hiddenAdminText: "Totals appear when the poll closes. Nobody sees them before, administrators included. The number of ballots cast is shown below.",
    notAllowedTitle: "Results are not available to you",
    notAllowedText: "The organization chose who sees the results of this poll.",
    finalTitle: "Final results",
    ledger: "Ledger",
    ledgerText: "Every ballot is recorded in an append-only list with a root that commits to all of them. The receipt code shown after voting finds a ballot here.",
    root: "Root",
    size: "Entries",
    receipts: "Receipt codes",
    check: "Check a receipt",
    checkHelp: "Enter the receipt code shown after voting.",
    checkSubmit: "Check",
    checkFound: "This ballot is in the ledger.",
    checkNotFound: "No ballot has this receipt code.",
    checkPosition: "Position {n} of {size}",
    checkProof: "Inclusion proof verified against the root.",
    ledgerNotYet: "The ledger is published when the poll closes.",
    share: "Share of ballots",
    winner: "Most votes",
    tie: "Tie",
    noBallots: "No ballot was cast.",
  },
  history: {
    title: "History",
    empty: "Nothing yet.",
    actions: { created: "Poll created", roll_added: "Addresses added to the roll", roll_added_late: "Addresses added after opening", opened: "Poll opened (roll count and code)", closed: "Poll closed" },
  },
  space: {
    title: "Organization",
    settings: "Settings",
    name: "Name",
    language: "Language of the interface",
    template: "Default ballot template",
    save: "Save the settings",
    saved: "Settings saved.",
    keys: "Keys",
    keysText: "Each person signs in with a key. A key holds the owner role (manages the organization), the administrator role (runs polls), or both. A key is shown once, when it is created.",
    keyLabel: "Who the key is for",
    keyRoles: "Roles",
    addKey: "Add a key",
    createKey: "Create the key",
    revoke: "Revoke",
    revoked: "Revoked",
    confirmRevoke: "Revoke this key? It stops working immediately.",
    you: "this session",
    newKeyTitle: "New key",
    newKeyText: "Copy it now. It is not stored in a readable form and is not shown again.",
    danger: "Delete the organization",
    dangerText: "Deletes the organization, its keys, polls, rolls and ballots. This cannot be undone.",
    confirmName: "Type the name of the organization to confirm",
    deleteSpace: "Delete everything",
  },
  voter: {
    lede: "Choose one option, then submit the ballot.",
    facts: "How this vote works",
    closes: "Closes",
    noClose: "When an administrator closes it",
    roll: "Roll",
    rollValue: "{n} members",
    rollNote: "Identified by the code {code}.",
    results: "Results",
    ballotType: "Ballot",
    ballotValue: "Secret",
    ballotNote: "The ballot is recorded without your name. This test edition stores it without encryption.",
    submit: "Submit the ballot",
    legend: "Your choice",
    problem: "The ballot was not recorded.",
    doneTitle: "Ballot recorded",
    doneText: "Your ballot is recorded. Keep the receipt code: it finds your ballot in the ledger once the poll closes. It does not reveal your choice.",
    doneLabel: "Receipt code",
    doneNote: "Votes cannot be changed after submission.",
    doneResults: "See the results",
    votedTitle: "A ballot was already submitted with this link",
    votedText: "Each link counts once. The receipt code was shown when the ballot was recorded.",
    closedTitle: "This poll is closed",
    closedText: "Voting has ended. The results are shown to the audience the organization chose.",
    notOpenTitle: "This poll is not open yet",
    notOpenText: "Come back when the administrators have opened it.",
    unknownTitle: "This link is not valid",
    unknownText: "Check the link in the message you received, or ask an administrator for a new one.",
    seeResults: "Results",
    publicResults: "Results of this poll",
  },
  resultsStatement: {
    close: {
      administrators: "Results are shown to the administrators when the poll closes.",
      voters: "Results are shown to the members on the roll when the poll closes.",
      anyone: "Results are public when the poll closes.",
    },
    live: {
      administrators: "Results are shown live to the administrators.",
      voters: "Results are shown live to the members on the roll. You will see the totals change as ballots arrive.",
      anyone: "Results are public and update live as ballots arrive.",
    },
  },
  errors: {
    name_required: "Enter a name.",
    name_too_long: "The name is too long (80 characters at most).",
    label_required: "Enter who the key is for.",
    label_too_long: "The label is too long (60 characters at most).",
    role_required: "Choose at least one role.",
    forbidden: "This key does not allow that action.",
    not_found: "Not found.",
    last_owner: "The last owner key cannot be revoked. Create another owner key first.",
    name_mismatch: "The name does not match.",
    title_required: "Enter the question.",
    title_too_long: "The question is too long (140 characters at most).",
    description_too_long: "The details are too long (2,000 characters at most).",
    invalid_results: "Choose when and to whom results are shown.",
    invalid_duration: "Enter a whole number of hours between 1 and 720.",
    options_too_few: "Write at least two options.",
    options_too_many: "Twelve options at most.",
    options_duplicate: "Two options have the same text.",
    option_too_long: "An option is too long (120 characters at most).",
    locked: "This cannot be changed anymore.",
    nothing_entered: "Enter at least one address.",
    too_many_addresses: "The roll holds 200 addresses at most.",
    roll_empty: "Add at least one address before opening.",
    unknown_link: "This link is not valid.",
    closed: "This poll is closed.",
    not_open: "This poll is not open yet.",
    already_voted: "A ballot was already submitted with this link.",
    not_allowed: "This link cannot vote now.",
    required: "Choose one option.",
    unknown_option: "This option does not exist. Choose one from the list.",
    invalid_type: "The answer is not valid.",
  },
};

const fr: ConsoleMessages = {
  edition: {
    label: "Édition de test",
    text: "Les bulletins sont conservés sans chiffrement et les données peuvent être effacées. Ne pas l’utiliser pour une décision qui exige un scrutin secret.",
  },
  nav: { label: "Administration", polls: "Scrutins", space: "Organisation", signOut: "Se déconnecter", signIn: "Se connecter", start: "Créer une organisation" },
  common: { save: "Enregistrer", cancel: "Annuler", back: "Retour", copy: "Copier", copied: "Copié", delete: "Supprimer", open: "Ouvrir", close: "Fermer", none: "Aucun", yes: "Oui", no: "Non", optional: "facultatif" },
  status: { draft: "Brouillon", open: "Ouvert", closed: "Fermé" },
  member: { listed: "Inscrit à la liste", requested: "Demandé", confirmed: "Confirmé", voted: "A voté", withdrawn: "Retiré", bounced: "Adresse refusée", blocked: "Bloqué" },
  role: { owner: "Titulaire du compte", administrator: "Administration", both: "Titulaire et administration" },
  start: {
    title: "Créer une organisation",
    lede: "Une organisation regroupe des scrutins, des administrateurs et des membres. La création donne une clé qui ouvre une session de titulaire du compte et d’administration.",
    name: "Nom de l’organisation",
    language: "Langue de l’interface",
    submit: "Créer l’organisation",
    haveKey: "Une clé existe déjà? Se connecter",
    keyTitle: "Conserver cette clé",
    keyText: "La clé ouvre une session dans cette organisation. Elle est affichée une seule fois et n’est pas conservée sous une forme lisible: elle ne peut pas être récupérée. Une autre personne titulaire peut créer une nouvelle clé.",
    keyLabel: "Clé",
    keyWarning: "Toute personne qui possède la clé peut ouvrir une session de titulaire du compte et d’administration.",
    keyContinue: "La clé est conservée. Continuer",
    download: "Télécharger en fichier texte",
  },
  signin: {
    title: "Se connecter",
    lede: "Saisir la clé d’une personne titulaire du compte ou d’une administration.",
    key: "Clé",
    hint: "Format: QK-XXXXXX-XXXXXX-XXXXXX-XXXXXX. Les majuscules et les traits d’union n’ont pas d’importance.",
    submit: "Se connecter",
    invalid: "Cette clé n’est pas valide ou a été révoquée. Vérifier la clé et réessayer.",
    tooMany: "Trop de tentatives. Attendre quelques minutes et réessayer.",
    noSpace: "Pas encore d’organisation?",
    create: "Créer une organisation",
  },
  polls: {
    title: "Scrutins",
    empty: "Aucun scrutin",
    emptyText: "Un scrutin est une question posée aux membres. En créer un, ajouter les adresses des membres, puis l’ouvrir.",
    create: "Nouveau scrutin",
    roll: "Liste",
    ballots: "Bulletins",
    opened: "Ouvert le",
    closes: "Ferme le",
    noPolls: "Cette clé a seulement le rôle de titulaire du compte. Les scrutins se gèrent avec une clé d’administration.",
  },
  form: {
    newTitle: "Nouveau scrutin",
    editTitle: "Modifier le scrutin",
    question: "Question",
    questionHelp: "Le texte que les membres lisent en haut du bulletin.",
    details: "Précisions",
    detailsHelp: "Contexte affiché sous la question. Par exemple le montant, l’échéance ou l’endroit où lire la proposition.",
    kind: "Type de question",
    kindYesNo: "Pour, contre, abstention",
    kindYesNoText: "Une proposition à adopter ou à rejeter. Trois choix fixes.",
    kindChoice: "Un choix parmi plusieurs",
    kindChoiceText: "Les membres choisissent une option dans une liste rédigée par l’administration.",
    options: "Options",
    optionsHelp: "De deux à douze options. Les lignes vides sont ignorées.",
    optionN: "Option {n}",
    addOption: "Ajouter une option",
    results: "Résultats",
    resultsHelp: "Décidé avant l’ouverture et affiché aux membres sur le bulletin. Impossible à modifier une fois le scrutin ouvert.",
    timing: "Moment où les résultats sont affichés",
    audience: "Qui voit les résultats",
    timingNames: {
      title: { close: "À la fermeture du scrutin", live: "Au fur et à mesure des bulletins" },
      text: { close: "Personne ne voit les totaux avant la fermeture, administration comprise. C’est la règle habituelle du scrutin secret.", live: "Les totaux et la participation se mettent à jour en temps réel pour le public choisi pendant le vote." },
    },
    audienceNames: {
      title: { administrators: "L’administration", voters: "Les membres de la liste", anyone: "Toute personne qui a l’adresse" },
      text: { administrators: "Seulement les personnes connectées avec une clé d’administration.", voters: "Toute personne qui possède un lien de vote personnel.", anyone: "Une page de résultats publique, sans connexion." },
    },
    template: "Modèle de bulletin",
    templateSeed: "Seed Packet",
    templateBallot: "Ballot Paper",
    duration: "Fermeture",
    durationManual: "L’administration ferme le scrutin",
    durationHours: "Ferme seul après un nombre d’heures",
    durationHelp: "Compté à partir de l’ouverture du scrutin. Entre 1 et 720 heures.",
    preview: "Ce que les membres voient",
    locked: "Les paramètres des résultats et les options sont fixés une fois le scrutin ouvert.",
    create: "Créer le scrutin",
    smallRoll: "Avec une petite liste, des totaux en direct peuvent révéler le vote d’une personne. La liste compte moins de 5 adresses.",
  },
  poll: {
    overview: "Aperçu",
    roll: "Liste",
    results: "Résultats",
    history: "Historique",
    facts: "En un coup d’œil",
    rollCount: "Sur la liste",
    rollCode: "Code de la liste",
    rollCodeNote: "Identifie la liste exacte des adresses au moment de l’ouverture du scrutin.",
    voted: "Ont voté",
    turnout: "Participation",
    openedAt: "Ouvert le",
    closesAt: "Ferme le",
    closedAt: "Fermé le",
    manual: "Quand l’administration le ferme",
    openNow: "Ouvrir le scrutin",
    openNote: "L’ouverture fige la liste et son code, ainsi que les options et les paramètres des résultats. Les membres peuvent ensuite voter avec leur lien.",
    openNeedsRoll: "Ajouter au moins une adresse à la liste avant l’ouverture.",
    closeNow: "Fermer le scrutin",
    closeNote: "La fermeture met fin au vote et publie les résultats finaux au public choisi.",
    deletePoll: "Supprimer le brouillon",
    confirmDelete: "Supprimer ce brouillon et sa liste?",
    confirmOpen: "Ouvrir le scrutin maintenant? La liste et les paramètres ne pourront plus être modifiés.",
    confirmClose: "Fermer le scrutin maintenant? Le vote prend fin et ne peut pas reprendre.",
    edit: "Modifier",
    draftNote: "Brouillon. Personne ne peut voter pour l’instant.",
    openNote2: "Le vote est ouvert.",
    closedNote: "Le vote est terminé.",
    settings: "Paramètres",
    resultsRule: "Résultats",
  },
  roll: {
    title: "Liste des votants",
    add: "Ajouter des adresses",
    addHelp: "Une adresse par ligne, ou séparées par des virgules ou des points-virgules. Jusqu’à 200 par scrutin.",
    addPlaceholder: "nom@exemple.org",
    addSubmit: "Ajouter à la liste",
    added: "{n} ajoutée(s).",
    duplicates: "{n} déjà sur la liste.",
    rejected: "Non ajoutées:",
    reasonInvalid: "adresse non valide",
    reasonDisposable: "service d’adresses jetables",
    address: "Adresse",
    status: "Statut",
    link: "Lien personnel",
    late: "Ajoutée après l’ouverture",
    remove: "Retirer",
    empty: "Aucune adresse pour l’instant.",
    linksTitle: "Liens personnels",
    linksText: "Chaque membre vote avec son propre lien. Dans l’édition de test, rien n’est envoyé par courriel: copier chaque lien et l’envoyer soi-même. Un lien sert une seule fois.",
    copyLink: "Copier le lien",
    copyAll: "Copier tous les liens",
    lateNote: "Ajoutée après l’ouverture du scrutin. Indiqué ici pour que chacun voie que la liste a changé.",
    votedNote: "Indique qu’un bulletin a été déposé, jamais lequel.",
    day: "Jour du vote",
  },
  results: {
    title: "Résultats",
    live: "En direct",
    updated: "Mis à jour à",
    updating: "Mise à jour",
    turnout: "Bulletins déposés",
    of: "sur",
    votes: "votes",
    total: "Total",
    hiddenTitle: "Les résultats ne sont pas encore affichés",
    hiddenText: "Les totaux apparaissent à la fermeture du scrutin.",
    hiddenAdminText: "Les totaux apparaissent à la fermeture du scrutin. Personne ne les voit avant, administration comprise. Le nombre de bulletins déposés est affiché plus bas.",
    notAllowedTitle: "Les résultats ne sont pas accessibles avec ce lien",
    notAllowedText: "L’organisation a choisi qui voit les résultats de ce scrutin.",
    finalTitle: "Résultats finaux",
    ledger: "Registre",
    ledgerText: "Chaque bulletin est inscrit dans une liste à ajout seulement, dont la racine engage tous les bulletins. Le code de reçu affiché après le vote permet d’y retrouver un bulletin.",
    root: "Racine",
    size: "Inscriptions",
    receipts: "Codes de reçu",
    check: "Vérifier un reçu",
    checkHelp: "Saisir le code de reçu affiché après le vote.",
    checkSubmit: "Vérifier",
    checkFound: "Ce bulletin figure dans le registre.",
    checkNotFound: "Aucun bulletin n’a ce code de reçu.",
    checkPosition: "Position {n} sur {size}",
    checkProof: "Preuve d’inclusion vérifiée par rapport à la racine.",
    ledgerNotYet: "Le registre est publié à la fermeture du scrutin.",
    share: "Part des bulletins",
    winner: "Le plus de votes",
    tie: "Égalité",
    noBallots: "Aucun bulletin n’a été déposé.",
  },
  history: {
    title: "Historique",
    empty: "Rien pour l’instant.",
    actions: { created: "Scrutin créé", roll_added: "Adresses ajoutées à la liste", roll_added_late: "Adresses ajoutées après l’ouverture", opened: "Scrutin ouvert (nombre et code de la liste)", closed: "Scrutin fermé" },
  },
  space: {
    title: "Organisation",
    settings: "Paramètres",
    name: "Nom",
    language: "Langue de l’interface",
    template: "Modèle de bulletin par défaut",
    save: "Enregistrer les paramètres",
    saved: "Paramètres enregistrés.",
    keys: "Clés",
    keysText: "Chaque personne ouvre une session avec une clé. Une clé porte le rôle de titulaire du compte (gère l’organisation), celui d’administration (gère les scrutins), ou les deux. Une clé est affichée une seule fois, à sa création.",
    keyLabel: "Pour qui est la clé",
    keyRoles: "Rôles",
    addKey: "Ajouter une clé",
    createKey: "Créer la clé",
    revoke: "Révoquer",
    revoked: "Révoquée",
    confirmRevoke: "Révoquer cette clé? Elle cesse de fonctionner immédiatement.",
    you: "cette session",
    newKeyTitle: "Nouvelle clé",
    newKeyText: "La copier maintenant. Elle n’est pas conservée sous une forme lisible et ne sera plus affichée.",
    danger: "Supprimer l’organisation",
    dangerText: "Supprime l’organisation, ses clés, ses scrutins, ses listes et ses bulletins. Cette action est irréversible.",
    confirmName: "Saisir le nom de l’organisation pour confirmer",
    deleteSpace: "Tout supprimer",
  },
  voter: {
    lede: "Choisir une option, puis déposer le bulletin.",
    facts: "Fonctionnement de ce vote",
    closes: "Fermeture",
    noClose: "Quand l’administration le ferme",
    roll: "Liste",
    rollValue: "{n} membres",
    rollNote: "Identifiée par le code {code}.",
    results: "Résultats",
    ballotType: "Bulletin",
    ballotValue: "Secret",
    ballotNote: "Le bulletin est enregistré sans votre nom. Cette édition de test le conserve sans chiffrement.",
    submit: "Déposer le bulletin",
    legend: "Votre choix",
    problem: "Le bulletin n’a pas été enregistré.",
    doneTitle: "Bulletin enregistré",
    doneText: "Votre bulletin est enregistré. Conserver le code de reçu: il permet de retrouver le bulletin dans le registre à la fermeture du scrutin. Il ne révèle pas le choix.",
    doneLabel: "Code de reçu",
    doneNote: "Un vote ne peut pas être modifié après le dépôt.",
    doneResults: "Voir les résultats",
    votedTitle: "Un bulletin a déjà été déposé avec ce lien",
    votedText: "Chaque lien compte une seule fois. Le code de reçu a été affiché au moment de l’enregistrement.",
    closedTitle: "Ce scrutin est fermé",
    closedText: "Le vote est terminé. Les résultats sont affichés au public choisi par l’organisation.",
    notOpenTitle: "Ce scrutin n’est pas encore ouvert",
    notOpenText: "Revenir quand l’administration l’aura ouvert.",
    unknownTitle: "Ce lien n’est pas valide",
    unknownText: "Vérifier le lien dans le message reçu, ou demander un nouveau lien à l’administration.",
    seeResults: "Résultats",
    publicResults: "Résultats de ce scrutin",
  },
  resultsStatement: {
    close: {
      administrators: "Les résultats sont affichés à l’administration à la fermeture du scrutin.",
      voters: "Les résultats sont affichés aux membres de la liste à la fermeture du scrutin.",
      anyone: "Les résultats sont publics à la fermeture du scrutin.",
    },
    live: {
      administrators: "Les résultats sont affichés en direct à l’administration.",
      voters: "Les résultats sont affichés en direct aux membres de la liste. Les totaux changent au fur et à mesure des bulletins.",
      anyone: "Les résultats sont publics et se mettent à jour en direct au fur et à mesure des bulletins.",
    },
  },
  errors: {
    name_required: "Saisir un nom.",
    name_too_long: "Le nom est trop long (80 caractères au maximum).",
    label_required: "Indiquer pour qui est la clé.",
    label_too_long: "L’étiquette est trop longue (60 caractères au maximum).",
    role_required: "Choisir au moins un rôle.",
    forbidden: "Cette clé ne permet pas cette action.",
    not_found: "Introuvable.",
    last_owner: "La dernière clé de titulaire ne peut pas être révoquée. Créer d’abord une autre clé de titulaire.",
    name_mismatch: "Le nom ne correspond pas.",
    title_required: "Saisir la question.",
    title_too_long: "La question est trop longue (140 caractères au maximum).",
    description_too_long: "Les précisions sont trop longues (2 000 caractères au maximum).",
    invalid_results: "Choisir quand et pour qui les résultats sont affichés.",
    invalid_duration: "Saisir un nombre entier d’heures entre 1 et 720.",
    options_too_few: "Rédiger au moins deux options.",
    options_too_many: "Douze options au maximum.",
    options_duplicate: "Deux options ont le même texte.",
    option_too_long: "Une option est trop longue (120 caractères au maximum).",
    locked: "Cela ne peut plus être modifié.",
    nothing_entered: "Saisir au moins une adresse.",
    too_many_addresses: "La liste compte 200 adresses au maximum.",
    roll_empty: "Ajouter au moins une adresse avant l’ouverture.",
    unknown_link: "Ce lien n’est pas valide.",
    closed: "Ce scrutin est fermé.",
    not_open: "Ce scrutin n’est pas encore ouvert.",
    already_voted: "Un bulletin a déjà été déposé avec ce lien.",
    not_allowed: "Ce lien ne peut pas voter maintenant.",
    required: "Choisir une option.",
    unknown_option: "Cette option n’existe pas. En choisir une dans la liste.",
    invalid_type: "La réponse n’est pas valide.",
  },
};

export const consoleMessages: Readonly<Record<Locale, ConsoleMessages>> = { fr, en };

/** Replaces {name} in a text with a value. */
export function fill(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

export function errorText(m: ConsoleMessages, code: string | undefined): string {
  return (code && m.errors[code]) || m.errors["invalid_type"] || "";
}
