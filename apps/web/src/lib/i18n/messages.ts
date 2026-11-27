import type { ErrorCode } from "@qohesion/engine";
import type { Locale } from "./negotiate";

/**
 * Interface text. Written in the functional register of docs/content-style.md, except `brand.tagline`.
 * French and English have the same keys; the type below enforces it.
 */
export interface Messages {
  readonly brand: { readonly name: string; readonly tagline: string };
  readonly shell: {
    readonly skip: string;
    readonly language: string;
    readonly languageFr: string;
    readonly languageEn: string;
    readonly version: string;
    readonly build: string;
    readonly source: string;
    readonly licence: string;
  };
  readonly home: {
    readonly title: string;
    readonly statement: string;
    readonly state: string;
    readonly previewLink: string;
    readonly previewNote: string;
    readonly versionLink: string;
    readonly versionNote: string;
  };
  readonly changelog: {
    readonly title: string;
    readonly note: string;
    readonly unreleased: string;
    readonly released: string;
    readonly link: string;
    readonly linkNote: string;
  };
  readonly preview: {
    readonly title: string;
    readonly organization: string;
    readonly lede: string;
    readonly stepsLabel: string;
    readonly closes: string;
    readonly factsLabel: string;
    readonly quorum: string;
    readonly quorumValue: string;
    readonly quorumNote: string;
    readonly passing: string;
    readonly passingValue: string;
    readonly passingNote: string;
    readonly ballotType: string;
    readonly ballotTypeValue: string;
    readonly ballotTypeNote: string;
    readonly choiceLegend: string;
    readonly receiptNote: string;
    readonly submit: string;
    readonly sample: string;
    readonly templates: string;
    readonly templateSeedPacket: string;
    readonly templateBallotPaper: string;
    readonly templateBoardingPass: string;
    readonly templateGuideMap: string;
    readonly templateStandard: string;
    readonly doneTitle: string;
    readonly doneText: string;
    readonly doneLabel: string;
    readonly doneExample: string;
    readonly doneNote: string;
    readonly doneBack: string;
    readonly errorSummary: string;
  };
  /** One text per validation code of the engine. Each states what happened, what it means and what to do. */
  readonly errors: Readonly<Record<ErrorCode, string>>;
}

const en: Messages = {
  brand: { name: "Qohesion", tagline: "Decide together" },
  shell: {
    skip: "Skip to content",
    language: "Display language",
    languageFr: "Français",
    languageEn: "English",
    version: "Version",
    build: "Build",
    source: "Source code",
    licence: "AGPL-3.0-or-later",
  },
  home: {
    title: "Qohesion",
    statement: "Qohesion is open-source software for holding votes and polls in groups such as associations, unions and councils.",
    state: "Alpha version. Voting is not available yet: this build contains the ballot screen preview and the version information.",
    previewLink: "Ballot screen preview",
    previewNote: "One question with three choices, in five templates. No ballot is recorded.",
    versionLink: "Version information",
    versionNote: "Version, release channel, commit and build date, as JSON.",
  },
  changelog: {
    title: "Changelog",
    note: "Changes by version, newest first. Entries are written in English. While the version number starts with 0, any version may change behaviour or data formats; the upgrade notes of each version say what an administrator must do.",
    unreleased: "Unreleased",
    released: "Released",
    link: "Changelog",
    linkNote: "Changes by version, with upgrade notes.",
  },
  preview: {
    title: "Ballot screen preview",
    organization: "Association des usagers du parc",
    lede: "Board proposal: budget of $12,400 for the year 2027.",
    stepsLabel: "Question 1 of 3",
    closes: "Closes: Dec 12, 8 pm (Eastern Time)",
    factsLabel: "Voting rules",
    quorum: "Quorum",
    quorumValue: "50% + 1",
    quorumNote: "Minimum number of registered members who must vote for the result to be valid.",
    passing: "Passing rule",
    passingValue: "Simple majority",
    passingNote: "More than half of the votes cast is required to pass the proposal.",
    ballotType: "Ballot type",
    ballotTypeValue: "Secret",
    ballotTypeNote: "The ballot is recorded without the voter’s name.",
    choiceLegend: "Choice",
    receiptNote: "A receipt code is displayed after the ballot is submitted.",
    submit: "Submit ballot",
    sample: "Development preview. The organization and figures are fictitious.",
    templates: "Template",
    templateSeedPacket: "Seed Packet",
    templateBallotPaper: "Ballot Paper",
    templateBoardingPass: "Boarding Pass",
    templateGuideMap: "Guide Map",
    templateStandard: "Standard",
    doneTitle: "The choice is valid",
    doneText: "In this preview no ballot is recorded. In a real vote, a receipt code is displayed at this point. The code allows checking later that the ballot is included in the count. It does not reveal the choice made.",
    doneLabel: "Receipt code",
    doneExample: "Example of the format. Not linked to any ballot.",
    doneNote: "Question 2 of 3 is not part of the preview.",
    doneBack: "Back to the question",
    errorSummary: "The ballot was not submitted.",
  },
  errors: {
    required: "No option selected. The ballot cannot be submitted without a choice. Select an option to continue.",
    invalid_type: "The answer has an unexpected form. It was not accepted. Submit the ballot again from this page.",
    unknown_option: "The selected option is not part of this question. It was not accepted. Select an option from the list.",
    duplicate_option: "The same option was selected twice. Select each option once.",
    too_few: "Too few options selected. Select more options to continue.",
    too_many: "Too many options selected. Select fewer options to continue.",
    too_long: "The text is too long. Shorten the text to continue.",
    not_a_number: "The answer is not a number. Enter a number to continue.",
    not_an_integer: "The answer is not a whole number. Enter a whole number to continue.",
    below_min: "The number is below the minimum. Enter a higher number to continue.",
    above_max: "The number is above the maximum. Enter a lower number to continue.",
    invalid_color: "The colour is not valid. Choose a colour to continue.",
    low_contrast: "The colour contrast is too low for reading. Choose a darker or lighter colour to continue.",
  },
};

const fr: Messages = {
  brand: { name: "Qohesion", tagline: "Décidons ensemble" },
  shell: {
    skip: "Passer au contenu",
    language: "Langue d’affichage",
    languageFr: "Français",
    languageEn: "English",
    version: "Version",
    build: "Build",
    source: "Code source",
    licence: "AGPL-3.0-or-later",
  },
  home: {
    title: "Qohesion",
    statement: "Qohesion est un logiciel libre pour tenir des votes et des sondages dans des groupes tels que des associations, des syndicats et des conseils.",
    state: "Version alpha. Le vote n’est pas encore disponible : cette version contient l’aperçu du bulletin de vote et les informations de version.",
    previewLink: "Aperçu du bulletin de vote",
    previewNote: "Une question à trois choix, dans cinq modèles. Aucun bulletin n’est enregistré.",
    versionLink: "Informations de version",
    versionNote: "Version, canal de publication, commit et date de compilation, en JSON.",
  },
  changelog: {
    title: "Journal des modifications",
    note: "Modifications par version, de la plus récente à la plus ancienne. Les entrées sont rédigées en anglais. Tant que le numéro de version commence par 0, toute version peut modifier le comportement ou les formats de données; les notes de mise à jour de chaque version indiquent ce que l’administrateur doit faire.",
    unreleased: "Non publiée",
    released: "Publiée",
    link: "Journal des modifications",
    linkNote: "Modifications par version, avec notes de mise à jour.",
  },
  preview: {
    title: "Aperçu du bulletin de vote",
    organization: "Association des usagers du parc",
    lede: "Proposition du conseil : budget de 12 400 $ pour l’année 2027.",
    stepsLabel: "Question 1 sur 3",
    closes: "Fermeture : 12 déc., 20 h (heure de l’Est)",
    factsLabel: "Règles du scrutin",
    quorum: "Quorum",
    quorumValue: "50 % + 1",
    quorumNote: "Nombre minimal de membres inscrits qui doivent voter pour que le résultat soit valide.",
    passing: "Adoption",
    passingValue: "Majorité simple",
    passingNote: "Plus de la moitié des votes exprimés est requise pour adopter la proposition.",
    ballotType: "Scrutin",
    ballotTypeValue: "Secret",
    ballotTypeNote: "Le bulletin est enregistré sans le nom du votant.",
    choiceLegend: "Choix",
    receiptNote: "Un code de reçu est affiché après l’envoi du bulletin.",
    submit: "Soumettre le bulletin",
    sample: "Aperçu de développement. L’organisation et les chiffres sont fictifs.",
    templates: "Modèle",
    templateSeedPacket: "Seed Packet",
    templateBallotPaper: "Ballot Paper",
    templateBoardingPass: "Boarding Pass",
    templateGuideMap: "Guide Map",
    templateStandard: "Standard",
    doneTitle: "Le choix est valide",
    doneText: "Dans cet aperçu, aucun bulletin n’est enregistré. Dans un vote réel, un code de reçu est affiché à cette étape. Le code permet de vérifier plus tard que le bulletin figure dans le décompte. Il ne révèle pas le choix exprimé.",
    doneLabel: "Code de reçu",
    doneExample: "Exemple de format. Sans lien avec un bulletin.",
    doneNote: "La question 2 sur 3 ne fait pas partie de l’aperçu.",
    doneBack: "Retour à la question",
    errorSummary: "Le bulletin n’a pas été soumis.",
  },
  errors: {
    required: "Aucune option sélectionnée. Le bulletin ne peut pas être soumis sans choix. Sélectionner une option pour continuer.",
    invalid_type: "La réponse a une forme inattendue. Elle n’a pas été acceptée. Soumettre de nouveau le bulletin à partir de cette page.",
    unknown_option: "L’option sélectionnée ne fait pas partie de cette question. Elle n’a pas été acceptée. Sélectionner une option de la liste.",
    duplicate_option: "La même option a été sélectionnée deux fois. Sélectionner chaque option une seule fois.",
    too_few: "Trop peu d’options sélectionnées. Sélectionner d’autres options pour continuer.",
    too_many: "Trop d’options sélectionnées. En sélectionner moins pour continuer.",
    too_long: "Le texte est trop long. Raccourcir le texte pour continuer.",
    not_a_number: "La réponse n’est pas un nombre. Saisir un nombre pour continuer.",
    not_an_integer: "La réponse n’est pas un nombre entier. Saisir un nombre entier pour continuer.",
    below_min: "Le nombre est inférieur au minimum. Saisir un nombre plus élevé pour continuer.",
    above_max: "Le nombre est supérieur au maximum. Saisir un nombre moins élevé pour continuer.",
    invalid_color: "La couleur n’est pas valide. Choisir une couleur pour continuer.",
    low_contrast: "Le contraste de la couleur est trop faible pour la lecture. Choisir une couleur plus foncée ou plus claire pour continuer.",
  },
};

export const messages: Readonly<Record<Locale, Messages>> = { fr, en };
