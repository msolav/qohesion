// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Explanations of how a poll works, shown beside each setting and on the information pages (/how and /methods).
 * Functional register (docs/content-style.md): each claim names its mechanism and its limit, and a feature that is not
 * built is described as planned. French and English have the same keys; the type enforces it.
 */

import type { Locale } from "./negotiate";
import type { EmailMode, NameMode } from "../disclosure";
import type { MethodFamily, MethodId } from "../methods";

export type TopicId = "secret" | "named" | "sealed" | "counting-key" | "receipt" | "publication" | "list" | "approval";
export const TOPIC_IDS: readonly TopicId[] = ["secret", "named", "list", "sealed", "counting-key", "receipt", "publication", "approval"];

export interface Topic {
  readonly title: string;
  readonly summary: string;
  readonly body: readonly string[];
  /** How it is done, in the order it happens. */
  readonly steps: readonly string[];
  /** What it does not protect against. */
  readonly limits: readonly string[];
}

export interface MethodText {
  readonly name: string;
  readonly summary: string;
  readonly how: readonly string[];
  readonly limits: readonly string[];
}

export type PropertyId = "method" | "closing" | "roll" | "ballot" | "seal" | "change" | "results" | "receipt" | "list" | "publication" | "cancel" | "approval";

export interface GuideMessages {
  readonly props: {
    readonly labels: Readonly<Record<PropertyId, string>>;
    readonly learn: string;
    readonly newTab: string;
    readonly openPage: string;
    readonly close: string;
    readonly receiptMail: { readonly on: string; readonly off: string; readonly onText: string; readonly offText: string; readonly tiesText: string };
    readonly method: Readonly<Record<"yes-no" | "single", { readonly badge: string; readonly text: string }>>;
    readonly methodMany: { readonly badge: string; readonly text: string };
    readonly closingPlain: string;
    /** Descriptions written to stand alone: each names its subject and never opens with a pronoun that points back to a badge. */
    readonly texts: {
      readonly closingNone: string;
      readonly change: { readonly allowed: string; readonly final: string };
      readonly seal: { readonly sealed: string; readonly plainSecret: string; readonly plainNamed: string };
      readonly roll: { readonly note: string; readonly fixed: string; readonly late: string };
      readonly named: string;
      readonly secret: string;
      readonly secretVoters: string;
      readonly results: Readonly<Record<"close" | "live", Readonly<Record<"owner" | "administrators" | "voters" | "anyone", string>>>>;
    };
    readonly approvalBadge: string;
    readonly approvalNone: string;
    readonly rollFixed: string;
    readonly rollLate: string;
    readonly changeAllowed: string;
    readonly changeFinal: string;
    readonly listNobody: string;
    readonly listText: string;
    readonly listNothing: string;
    readonly listAdmins: string;
    readonly publication: { readonly badge: string; readonly text: string };
    readonly cancel: { readonly badge: string; readonly text: string };
  };
  readonly disclosure: {
    readonly title: string;
    readonly help: string;
    readonly nameTitle: string;
    readonly emailTitle: string;
    readonly nameModes: Readonly<Record<NameMode, { readonly title: string; readonly example: string; readonly phrase: string }>>;
    readonly emailModes: Readonly<Record<EmailMode, { readonly title: string; readonly example: string; readonly phrase: string }>>;
    readonly and: string;
    readonly nobody: string;
    readonly needsNames: string;
    readonly publicFull: string;
    readonly adminsFull: string;
    readonly previewTitle: string;
    readonly rollFormat: string;
    readonly rollFormatExample: string;
    readonly nameColumn: string;
  };
  readonly how: {
    readonly title: string;
    readonly lede: string;
    readonly contents: string;
    readonly stepsTitle: string;
    readonly limitsTitle: string;
    readonly more: string;
    readonly methodsLink: string;
    readonly topics: Readonly<Record<TopicId, Topic>>;
  };
  readonly methods: {
    readonly title: string;
    readonly lede: string;
    readonly contents: string;
    readonly built: string;
    readonly planned: string;
    readonly howTitle: string;
    readonly limitsTitle: string;
    readonly howLink: string;
    readonly infoLabel: string;
    readonly note: string;
    readonly families: Readonly<Record<MethodFamily, { readonly title: string; readonly text: string }>>;
    readonly list: Readonly<Record<MethodId, MethodText>>;
  };
}

const en: GuideMessages = {
  props: {
    labels: { method: "Question", closing: "Closing", roll: "Participants", ballot: "Who can tell who voted what", seal: "Encryption", change: "Changing a vote", results: "Results", receipt: "Receipt", list: "List of signatories", publication: "Published count", cancel: "Cancelling", approval: "Approval" },
    learn: "How this works",
    newTab: "opens in a new tab",
    openPage: "Open as a page",
    close: "Close",
    receiptMail: {
      on: "Sent by email on request",
      off: "Copy or file only",
      onText: "After voting, a participant can copy the receipt code, save it as a file, or ask for it by email. The message goes to the address that received the link. The message holds the code and the page where the code is checked, and no voting link.",
      offText: "After voting, a participant can copy the receipt code or save it as a file. No email is sent.",
      tiesText: "On this poll the email ties the address to the code, and the published list shows each ballot beside its code.",
    },
    method: {
      "yes-no": { badge: "In favour, against, abstention", text: "A proposal to adopt or reject. Each participant gives one of three answers. The answer with the most ballots leads." },
      single: { badge: "One choice among several", text: "Each participant picks one option from a list. The option with the most ballots leads. A majority is not required unless a closing rule sets a threshold." },
    },
    methodMany: { badge: "{n} questions", text: "The ballot has {n} questions, with one answer to each. Each question is counted on its own." },
    closingPlain: "The poll closes at the time shown. An administrator can also close it earlier.",
    texts: {
      closingNone: "The poll has no closing time. An administrator closes it.",
      change: {
        allowed: "A participant can change the vote until the poll closes. Only the last ballot submitted with the personal link is counted.",
        final: "A vote cannot be changed once the ballot is submitted. Each personal link accepts a single ballot, and a submitted ballot can be neither withdrawn nor replaced.",
      },
      seal: {
        sealed: "Each ballot is encrypted by the server as soon as it is received, and can be read only with the counting key, which an administrator uses when the poll closes. The server handles the ballot in readable form for the instant before it is encrypted.",
        plainSecret: "Ballots are stored in readable form, without names. Anyone with access to the database can read the choices but cannot tie them to a participant.",
        plainNamed: "Ballots are stored in readable form, with the address of the participant who cast each one. Anyone with access to the database can read each participant's answer.",
      },
      roll: {
        note: "The list of participants is identified by the code {code}.",
        fixed: "The list of participants is fixed when voting opens. No one can be added afterwards.",
        late: "Administrators can add participants while voting is open. Participants added after the opening are marked as late and are not covered by the code of the list.",
      },
      named: "Each answer is recorded with the address of the participant who gave it, and shown with that address to {who}.",
      secret: "Each ballot is recorded without the name of the participant. The record holds no reference from a ballot to a participant, nor from a participant to a ballot. The roll does not show who has voted: only the number of ballots is known.",
      secretVoters: "Each ballot is recorded without the name of the participant. The record holds no reference from a ballot to a participant. The roll shows who has voted, never what was chosen.",
      results: {
        close: {
          owner: "The results are shown to the owner once the poll has closed.",
          administrators: "The results are shown to the administrators once the poll has closed.",
          voters: "The results are shown to the participants on the roll once the poll has closed.",
          anyone: "The results are public once the poll has closed.",
        },
        live: {
          owner: "The results are shown to the owner as ballots arrive.",
          administrators: "The results are shown to the administrators as ballots arrive.",
          voters: "The totals are shown to the participants on the roll and change as ballots arrive.",
          anyone: "The results are public and update as ballots arrive.",
        },
      },
    },
    approvalBadge: "Approved by {a} of {n} administrators",
    approvalNone: "No approval step",
    rollFixed: "List fixed at opening",
    rollLate: "List can grow",
    changeAllowed: "Vote can be changed",
    changeFinal: "Vote is final",
    listNobody: "Not shown",
    listText: "The list of answers shows {what}. Administrators see the full entry.",
    listNothing: "The list of answers is not shown to participants. Only the totals are. Administrators see the full entry.",
    listAdmins: "Administrators see the full entry.",
    publication: { badge: "Count published", text: "After the close, everyone who sees the results also sees each ballot with its receipt code and its answer, so that the total can be checked." },
    cancel: { badge: "No cancelling after the first ballot", text: "Once a ballot has been cast, the poll runs to its end. The poll cannot be cancelled, so a result cannot be withdrawn." },
  },
  disclosure: {
    title: "Identity",
    help: "Each answer is shown with the identity of the participant, as written in the roll. Choose how much of the name and of the email address appears. Administrators always see the full entry.",
    nameTitle: "Name",
    emailTitle: "Email address",
    nameModes: {
      full: { title: "In full", example: "Marie Tremblay", phrase: "the full name" },
      masked: { title: "First name, last name hidden", example: "Marie T***", phrase: "the first name and the first letter of the last name" },
      none: { title: "Not shown", example: "", phrase: "" },
    },
    emailModes: {
      full: { title: "In full", example: "marie.tremblay@example.org", phrase: "the full address" },
      masked: { title: "Partly hidden", example: "m***y@e***e.org", phrase: "the address partly hidden" },
      none: { title: "Not shown", example: "", phrase: "" },
    },
    and: "and",
    nobody: "With neither the name nor the address shown, participants see the totals and no list of answers.",
    needsNames: "Names come from the participants list. Enter each one as Name <address>, with the first name first. An entry without a name shows its address alone, in the form chosen.",
    publicFull: "The results are public, and the address is shown in full: anyone with the link can read the addresses of the people who voted.",
    adminsFull: "Administrators see the full entry.",
    previewTitle: "Example",
    rollFormat: "A name can come before the address, in angle brackets, as in",
    rollFormatExample: "Marie Tremblay <marie@example.org>",
    nameColumn: "Name",
  },
  how: {
    title: "How a poll works",
    lede: "What is stored, who can read it and what each safeguard does not cover. Each section names the mechanism used.",
    contents: "On this page",
    stepsTitle: "How it is done",
    limitsTitle: "What it does not cover",
    more: "Back to the poll",
    methodsLink: "Voting methods",
    topics: {
      secret: {
        title: "Anonymous ballot",
        summary: "The answer is stored without a link to the person who gave it.",
        body: [
          "Each ballot is a separate record. It holds the answer, a random number and the identifier of the poll. It holds no reference to a participant, and the participants list holds no reference to a ballot. The list keeps the day each participant voted and nothing else about the vote.",
          "The order in which ballots arrive is not published. The published list is sorted by receipt code, so that the order cannot be set against the times at which people were seen voting.",
        ],
        steps: [
          "The participant opens a personal link. The server finds the entry of the list from a hash of the link.",
          "The server marks the entry as having voted and records the day.",
          "The server stores the ballot with no reference to the entry.",
          "Where a vote can be changed, a pseudonym is stored with the ballot. It is computed from a secret of the server and from the entry, and lets the last ballot of a person replace the earlier ones. It shows that two ballots come from the same person and does not show who that person is.",
        ],
        limits: [
          "The server receives the answer and the personal link in the same request. Anonymity holds in what is stored and shown, and relies on the server not recording the two together. An operator with full access to the server can change that.",
          "With few participants and results shown while voting runs, the totals can reveal how one person voted. The console warns when fewer than 5 addresses are listed.",
          "The pseudonym of a poll that allows changes can be recomputed by someone who holds the secret of the server.",
        ],
      },
      named: {
        title: "Named answers",
        summary: "Each answer is shown next to the person who gave it.",
        body: [
          "In a named poll, the ballot keeps a reference to the entry of the participant. The people who may see the results see who answered what, in the form the poll sets (see the list of signatories).",
          "Participants are told before they vote, on the rules page of the ballot. The poll cannot be changed from secret to named after it opens.",
        ],
        steps: [
          "The participant opens a personal link and reads the rules page, which states that answers are named.",
          "The server stores the ballot with a reference to the entry of the list.",
          "Where the poll shows the list of answers, each entry is written as the poll's setting says.",
        ],
        limits: [
          "A named poll gives no secrecy from the administrators, who see the full entry of each ballot.",
          "Naming applies to the people who see the results. If the results are public, so is the list, in the form chosen.",
        ],
      },
      list: {
        title: "List of signatories",
        summary: "For a named poll, administrators choose how names and addresses read.",
        body: [
          "The list of answers of a named poll can show the name, the address, both or neither. Each is shown in full, partly hidden or not shown, and any pair is allowed.",
          "A name is hidden by keeping the first name and the first letter of the last name: Marie Tremblay reads Marie T***. An address is hidden by keeping the first and the last letter of the part before the at sign and of the host name, and the ending of the domain: marie.tremblay@example.org reads m***y@e***e.org. The number of stars never follows the length of what is hidden.",
          "Administrators always see the full entry. Names come from the list of participants, where each entry can be written as Name <address>.",
        ],
        steps: [
          "The administrator enters participants as Name <address>, or as an address alone.",
          "In the poll's settings, the administrator picks how the name and how the address read.",
          "The ballot's rules page states the setting before anyone votes. The results page applies it.",
        ],
        limits: [
          "Partial hiding makes an entry harder to read, not impossible to guess. In a small group, a first name and the first letter of a last name can be enough to recognise a person.",
          "A setting that shows neither the name nor the address leaves participants with the totals only.",
        ],
      },
      sealed: {
        title: "Encrypted ballots",
        summary: "The answer is encrypted when received and can be read only with the counting key.",
        body: [
          "Encryption keeps the answers unreadable while voting runs, for the administrators and for anyone with access to the database.",
        ],
        steps: [
          "When the poll opens, the server creates a key pair. The public key is stored with the poll. The private key, called the counting key, is shown once and is not stored.",
          "Each ballot is encrypted to the public key. A new key is agreed for each ballot (X25519), a symmetric key is derived from it (HKDF-SHA-256), and the answer is encrypted with it (AES-256-GCM).",
          "The answer is padded to a fixed length before encryption, so that the length of a ballot does not tell which answer it holds.",
          "At the close, the counting key is entered. The server decrypts the ballots in memory and records the totals.",
        ],
        limits: [
          "The server encrypts the ballot after receiving it, so it sees the answer at that moment. Encryption protects what is stored, not what is sent.",
          "At the count, the key is given to the server, which reads the ballots in memory.",
          "If the counting key is lost, or too few shares remain, the ballots can never be read and the poll has no result. No one, including the service, can recover the key.",
          "This is not yet the audited scheme with a threshold key and a proof of correct decryption. That scheme is planned.",
          "Ballots cast before padding was added are not padded.",
        ],
      },
      "counting-key": {
        title: "Counting key and shares",
        summary: "The key that opens the ballots can be cut into shares held by several administrators.",
        body: [
          "With one key, one person can open the ballots. With shares, the key is cut with Shamir secret sharing into one share for each administrator, and a set number of shares, the threshold, must be entered together to open the ballots. Fewer shares give no information about the key.",
        ],
        steps: [
          "When the poll opens, the key is cut into shares. Each share is shown once, to the administrator who opens the poll, who gives each administrator their own. The server keeps none.",
          "At the close, administrators enter their shares. When the threshold is reached, the ballots open.",
        ],
        limits: [
          "A share that is lost counts against the threshold. If fewer shares than the threshold remain, the ballots stay closed.",
          "The shares pass through the screen of the administrator who opens the poll. Each administrator is responsible for keeping theirs.",
        ],
      },
      receipt: {
        title: "Receipt and ledger",
        summary: "Each ballot has a receipt code. The ballots form a ledger with a published root.",
        body: [
          "After voting, the participant receives a receipt code computed from the hash of the stored ballot. The code does not reveal the answer.",
          "Ballots are entries of a Merkle tree. Its root is a short value that depends on every ballot. When the poll closes, the root and the list of receipt codes are shown. A participant checks that their code is in the list. Anyone who kept the root from an earlier moment can detect a ballot that was added, removed or changed since.",
        ],
        steps: [
          "The server computes the hash of the ballot as stored, and derives the receipt code from it.",
          "The ballot is added to the ledger. The code is shown to the participant.",
          "At the close, the list of codes and the root are shown. The participant looks for the code.",
        ],
        limits: [
          "The ledger shows that nothing recorded was changed afterwards. It does not show that the answer was recorded as the participant gave it.",
          "A participant sees their own answer next to their code only if the poll publishes its count.",
          "A receipt sent by email ties the address to the code in the inbox and at the email provider. Where a secret poll publishes each ballot beside its code, that email lets whoever reads it find the answer. The setting is off by default for a secret poll.",
        ],
      },
      publication: {
        title: "Published count",
        summary: "After the close, the ballots are shown so that anyone can recount.",
        body: [
          "The published list holds each ballot with its receipt code and its answer, in the order of the receipt codes. For encrypted ballots, the ledger entries and the counting key are published too, so that anyone can decrypt the ballots and add them up.",
        ],
        steps: [
          "The poll closes and the count is made.",
          "The list of ballots, the root of the ledger and, for encrypted ballots, the counting key are shown to everyone who may see the results.",
          "A person who wants to recount downloads the list, adds up the answers and compares the totals and the root.",
        ],
        limits: [
          "In an anonymous poll the list shows answers without names. With few voters, or with several questions where each ballot is a rare combination, someone who knows how a person voted can find that ballot.",
          "Once published, the counting key cannot be withdrawn.",
        ],
      },
      approval: {
        title: "Approval by administrators",
        summary: "In an organization with several administrators, publishing and other changes need agreement.",
        body: [
          "The organization sets a rule: none, the majority of administrators, or all of them. With two or more administrators a request is never approved by one person alone.",
          "An approval applies to an exact version of the poll, identified by a digest. Any change starts the approval again. The ballot states how many administrators approved, when, and the digest, so that a participant can compare it with what they received.",
          "Every request, answer, decision and change is written in a record where each entry holds the hash of the one before. A checkpoint of the record can be kept elsewhere to detect a rewrite.",
        ],
        steps: [
          "An administrator asks to publish the poll. The request names the digest of the poll.",
          "The other administrators read the poll and answer: approve, reject or abstain.",
          "When the rule holds, the poll is published. If the poll is changed meanwhile, the request is void.",
        ],
        limits: [
          "Approvals are recorded on the word of signed-in sessions. Signing with keys held in the browser, which the server could not forge, is planned.",
          "With two administrators, both must be active. If one loses their key, recovery is not built yet.",
        ],
      },
    },
  },
  methods: {
    title: "Voting methods",
    lede: "Methods from voting theory and from polling, with how each one counts and where it falls short. Two are built. The others are described so that the plan can be read and discussed.",
    contents: "Methods",
    built: "Available",
    planned: "Planned",
    howTitle: "How the winner is found",
    limitsTitle: "Limits",
    howLink: "How the ballot and the count are protected",
    infoLabel: "About this method",
    note: "A method that is planned is not offered when a poll is made. The plan and its order are in the project's decision record 0011.",
    families: {
      decision: { title: "Deciding between options", text: "One winner. The ballot and the count differ by method, and so does the way a close result is treated." },
      seats: { title: "Filling several seats", text: "Several winners, for councils, boards and committees." },
      opinion: { title: "Allocation and opinion polling", text: "Points to share, scales and free answers. Some of these polls name no winner." },
    },
    list: {
      "yes-no": {
        name: "Yes, no or abstain",
        summary: "A proposal is adopted or rejected. Each participant answers in favour, against or abstains.",
        how: ["Ballots are counted for each of the three answers.", "The answer with the most ballots leads. Closing rules can set a quorum or a threshold."],
        limits: ["The count does not say whether abstentions help or hinder: the organization's rules decide that."],
      },
      single: {
        name: "One choice, first past the post",
        summary: "Each participant picks one option. The option with the most ballots leads.",
        how: ["Each participant picks one option.", "Ballots are counted for each option.", "The option with the most ballots leads. A tie is reported as a tie."],
        limits: ["A majority is not required. With many similar options, the vote splits and an option that most participants rank low can lead."],
      },
      majority: {
        name: "Majority threshold",
        summary: "An option wins only with more than half of the ballots cast, or with another set share.",
        how: ["The count is that of one choice among several.", "If no option reaches the share, the result is none."],
        limits: ["Needs a rule for what follows a result of none, such as a second round."],
      },
      "two-round": {
        name: "Two rounds",
        summary: "A second round opposes the two leading options when none passes a share in the first.",
        how: ["Round one counts one choice per participant.", "If no option passes the share, the two leading options, or those above a set share, go to round two.", "The option with the most ballots in round two wins."],
        limits: ["Needs a second vote and a second delay. Turnout often falls between rounds."],
      },
      approval: {
        name: "Approval voting",
        summary: "Each participant approves as many options as they accept. The option approved by the most participants wins.",
        how: ["Each participant ticks every option they accept.", "Approvals are counted for each option.", "The option with the most approvals wins."],
        limits: ["A ballot does not show how strongly an option is preferred. A participant who approves everyone gives no information."],
      },
      ranked: {
        name: "Ranked choice, instant runoff",
        summary: "Participants rank the options. Options with the fewest first choices are dropped, and their ballots pass to the next choice.",
        how: ["Each participant ranks the options in order.", "First choices are counted. If an option has more than half, it wins.", "Otherwise the option with the fewest first choices is dropped and its ballots go to their next choice. The count repeats."],
        limits: ["A candidate can lose by gaining support, in rare cases. The count is by rounds and takes longer to read.", "Published ranked ballots can identify a voter when there are many options."],
      },
      condorcet: {
        name: "Condorcet methods",
        summary: "Participants rank the options. Options are compared in pairs, and an option that beats every other wins.",
        how: ["Each participant ranks the options in order.", "For each pair, the ballots that prefer one to the other are counted.", "An option that wins every pair wins. If none does, a stated rule (Schulze or ranked pairs) picks one."],
        limits: ["Results are shown as a table of pairs, which takes explaining.", "Published ranked ballots can identify a voter when there are many options."],
      },
      borda: {
        name: "Borda count",
        summary: "Participants rank the options. Each rank gives points, and the points are added.",
        how: ["Each participant ranks the options in order.", "A first place gives the most points, the last none.", "Points are added for each option. The most points wins."],
        limits: ["Adding similar options can change the result."],
      },
      score: {
        name: "Score voting",
        summary: "Each participant gives each option a score on a numeric scale. The scores are added.",
        how: ["Each participant gives each option a score, for example from 0 to 5.", "Scores are added for each option.", "The highest total wins."],
        limits: ["Participants use scales differently. Some give extreme scores to have more weight."],
      },
      grading: {
        name: "Grading, majority judgment",
        summary: "Each participant gives each option a grade on a verbal scale. The option with the best median grade wins.",
        how: ["Each participant gives each option a grade, for example from Excellent to Reject.", "For each option, the median grade is found: half of the participants gave it that grade or better.", "The option with the best median wins. A tie is broken by removing the median grade from each tied option and comparing again."],
        limits: ["The result is shown as a distribution of grades for each option, which takes more reading than a total.", "Published graded ballots can identify a voter when there are many options."],
      },
      star: {
        name: "STAR voting",
        summary: "Participants score the options. The two with the highest totals go to a runoff decided by the ballots.",
        how: ["Each participant gives each option a score.", "Scores are added. The two options with the highest totals go to the runoff.", "Of these two, the option that more participants scored higher wins."],
        limits: ["Needs both a score and a count of preferences, which takes explaining."],
      },
      consent: {
        name: "Consent",
        summary: "A proposal passes when no participant holds a reasoned objection after discussion.",
        how: ["A proposal is presented and questions are answered.", "Each participant answers: consent, objection or abstention.", "The proposal passes if no objection stands after discussion."],
        limits: ["Needs a discussion step, which is not built."],
      },
      block: {
        name: "Block voting",
        summary: "Each participant votes for as many options as there are seats. The options with the most ballots win.",
        how: ["Each participant picks as many options as there are seats.", "The options with the most ballots win the seats."],
        limits: ["A majority group can win every seat."],
      },
      stv: {
        name: "Single transferable vote",
        summary: "Participants rank the options. Surplus votes and votes for dropped options pass to the next choice until the seats are filled.",
        how: ["Each participant ranks the options in order.", "A quota is computed from the number of ballots and of seats.", "An option that reaches the quota wins a seat, and its surplus passes on. The option with the fewest votes is dropped, and its ballots pass on. The count repeats until the seats are filled."],
        limits: ["The count is long and needs a tested reference.", "Published ranked ballots can identify a voter when there are many options."],
      },
      lists: {
        name: "Proportional lists",
        summary: "Each participant votes for a list. Seats are shared among the lists in proportion to their votes.",
        how: ["Each participant picks one list.", "Seats are shared by a divisor method (D'Hondt or Sainte-Laguë)."],
        limits: ["The method chosen changes how small lists fare."],
      },
      allocation: {
        name: "Points allocation",
        summary: "Each participant shares a budget of points among the options. The points are added.",
        how: ["Each participant is given a budget, for example 100 points.", "Each shares it among the options.", "Points are added for each option."],
        limits: ["Used for participatory budgeting and priorities. The poll names no winner unless one is set."],
      },
      quadratic: {
        name: "Quadratic voting",
        summary: "Each participant buys votes with a budget, and each added vote on one option costs more than the last.",
        how: ["Each participant is given a budget of credits.", "One vote on an option costs one credit, two cost four, three cost nine.", "Votes are added for each option."],
        limits: ["Only works if one person holds exactly one budget. That needs a strong check of identity."],
      },
      rating: {
        name: "Rating scale",
        summary: "Each participant rates statements on a scale, such as from strongly disagree to strongly agree.",
        how: ["Each participant rates each statement.", "The distribution of ratings is shown for each statement."],
        limits: ["An opinion poll. It names no winner."],
      },
      text: {
        name: "Free text or number",
        summary: "Each participant writes a short text or enters a number.",
        how: ["Each participant answers in a box.", "Answers are listed, or a number is summed or averaged."],
        limits: ["A free text can identify its author. The poll states it before it is answered."],
      },
    },
  },
};

const fr: GuideMessages = {
  props: {
    labels: { method: "Question", closing: "Fermeture", roll: "Participants", ballot: "Qui peut savoir qui a voté quoi", seal: "Chiffrement", change: "Modification du vote", results: "Résultats", receipt: "Reçu", list: "Liste des signataires", publication: "Décompte publié", cancel: "Annulation", approval: "Approbation" },
    learn: "Comment cela fonctionne",
    newTab: "s’ouvre dans un nouvel onglet",
    openPage: "Ouvrir dans une page",
    close: "Fermer",
    receiptMail: {
      on: "Envoyé par courriel sur demande",
      off: "Copie ou fichier seulement",
      onText: "Après le vote, la personne peut copier le code de reçu, l’enregistrer dans un fichier ou le demander par courriel. Le message est envoyé à l’adresse qui a reçu le lien. Le message contient le code et la page où le vérifier, et aucun lien de vote.",
      offText: "Après le vote, la personne peut copier le code de reçu ou l’enregistrer dans un fichier. Aucun courriel n’est envoyé.",
      tiesText: "Dans ce scrutin, le courriel associe l’adresse au code, et la liste publiée montre chaque bulletin à côté de son code.",
    },
    method: {
      "yes-no": { badge: "Pour, contre, abstention", text: "Une proposition à adopter ou à rejeter. Chaque participant donne l’une des trois réponses. La réponse qui a le plus de bulletins est en tête." },
      single: { badge: "Un choix parmi plusieurs", text: "Chaque participant choisit une option dans une liste. L’option qui a le plus de bulletins est en tête. Une majorité n’est pas exigée, sauf si une règle de fermeture fixe un seuil." },
    },
    methodMany: { badge: "{n} questions", text: "Le bulletin compte {n} questions, avec une réponse à chacune. Chaque question est comptée séparément." },
    closingPlain: "Le scrutin ferme à l’heure indiquée. L’administration peut aussi le fermer plus tôt.",
    texts: {
      closingNone: "Le scrutin n’a pas d’heure de fermeture. L’administration le ferme.",
      change: {
        allowed: "Une personne participante peut modifier son vote jusqu’à la fermeture du scrutin. Seul le dernier bulletin déposé avec le lien personnel est compté.",
        final: "Un vote ne peut plus être modifié une fois le bulletin déposé. Chaque lien personnel accepte un seul bulletin, et un bulletin déposé ne peut être ni retiré ni remplacé.",
      },
      seal: {
        sealed: "Chaque bulletin est chiffré par le serveur dès sa réception et ne peut être lu qu’avec la clé de dépouillement, que l’administration utilise à la fermeture du scrutin. Le serveur traite le bulletin sous forme lisible durant l’instant qui précède le chiffrement.",
        plainSecret: "Les bulletins sont conservés sous forme lisible, sans nom. Toute personne qui a accès à la base de données peut lire les choix, mais ne peut pas les associer à une personne participante.",
        plainNamed: "Les bulletins sont conservés sous forme lisible, avec l’adresse de la personne participante qui a déposé chacun. Toute personne qui a accès à la base de données peut lire la réponse de chaque participant.",
      },
      roll: {
        note: "La liste des participants est identifiée par le code {code}.",
        fixed: "La liste des participants est arrêtée à l’ouverture du vote. Personne ne peut être ajouté par la suite.",
        late: "L’administration peut ajouter des participants pendant le vote. Les participants ajoutés après l’ouverture sont marqués comme tardifs et ne sont pas couverts par le code de la liste.",
      },
      named: "Chaque réponse est enregistrée avec l’adresse de la personne participante qui l’a donnée, et affichée avec cette adresse {who}.",
      secret: "Chaque bulletin est enregistré sans le nom de la personne participante. Le registre ne contient aucune référence d’un bulletin à un participant, ni d’un participant à un bulletin. La liste n’indique pas qui a voté: seul le nombre de bulletins est connu.",
      secretVoters: "Chaque bulletin est enregistré sans le nom de la personne participante. Le registre ne contient aucune référence d’un bulletin à un participant. La liste indique qui a voté, jamais ce qui a été choisi.",
      results: {
        close: {
          owner: "Les résultats sont présentés au titulaire du compte une fois le scrutin fermé.",
          administrators: "Les résultats sont présentés à l’administration une fois le scrutin fermé.",
          voters: "Les résultats sont présentés aux participants de la liste une fois le scrutin fermé.",
          anyone: "Les résultats sont publics une fois le scrutin fermé.",
        },
        live: {
          owner: "Les résultats sont présentés au titulaire du compte à mesure que les bulletins arrivent.",
          administrators: "Les résultats sont présentés à l’administration à mesure que les bulletins arrivent.",
          voters: "Les totaux sont présentés aux participants de la liste et changent à mesure que les bulletins arrivent.",
          anyone: "Les résultats sont publics et se mettent à jour à mesure que les bulletins arrivent.",
        },
      },
    },
    approvalBadge: "Approuvé par {a} administrateurs sur {n}",
    approvalNone: "Sans étape d’approbation",
    rollFixed: "Liste fixée à l’ouverture",
    rollLate: "Liste extensible",
    changeAllowed: "Vote modifiable",
    changeFinal: "Vote définitif",
    listNobody: "Non affichée",
    listText: "La liste des réponses affiche {what}. Les administrateurs voient l’entrée complète.",
    listNothing: "La liste des réponses n’est pas affichée aux participants, seulement les totaux. Les administrateurs voient l’entrée complète.",
    listAdmins: "Les administrateurs voient l’entrée complète.",
    publication: { badge: "Décompte publié", text: "Après la fermeture, tous ceux qui voient les résultats voient aussi chaque bulletin avec son code de reçu et sa réponse, ce qui permet de vérifier le total." },
    cancel: { badge: "Aucune annulation après le premier bulletin", text: "Dès qu’un bulletin a été déposé, le vote va à son terme. Le scrutin ne peut pas être annulé, de sorte qu’un résultat ne peut pas être retiré." },
  },
  disclosure: {
    title: "Identité",
    help: "Chaque réponse est affichée avec l’identité du participant, telle qu’inscrite dans la liste. Choisir la part du nom et de l’adresse courriel qui apparaît. Les administrateurs voient toujours l’entrée complète.",
    nameTitle: "Nom",
    emailTitle: "Adresse courriel",
    nameModes: {
      full: { title: "En entier", example: "Marie Tremblay", phrase: "le nom en entier" },
      masked: { title: "Prénom, nom de famille masqué", example: "Marie T***", phrase: "le prénom et la première lettre du nom de famille" },
      none: { title: "Non affiché", example: "", phrase: "" },
    },
    emailModes: {
      full: { title: "En entier", example: "marie.tremblay@example.org", phrase: "l’adresse en entier" },
      masked: { title: "Partiellement masquée", example: "m***y@e***e.org", phrase: "l’adresse partiellement masquée" },
      none: { title: "Non affichée", example: "", phrase: "" },
    },
    and: "et",
    nobody: "Si ni le nom ni l’adresse ne sont affichés, les participants voient les totaux et aucune liste de réponses.",
    needsNames: "Les noms viennent de la liste des participants. Saisir chaque entrée sous la forme Nom <adresse>, le prénom en premier. Une entrée sans nom affiche son adresse seule, dans la forme choisie.",
    publicFull: "Les résultats sont publics et l’adresse est affichée en entier: toute personne qui a le lien peut lire les adresses de ceux qui ont voté.",
    adminsFull: "Les administrateurs voient l’entrée complète.",
    previewTitle: "Exemple",
    rollFormat: "Un nom peut précéder l’adresse, entre chevrons, comme dans",
    rollFormatExample: "Marie Tremblay <marie@example.org>",
    nameColumn: "Nom",
  },
  how: {
    title: "Fonctionnement d’un vote",
    lede: "Ce qui est conservé, qui peut le lire et ce que chaque protection ne couvre pas. Chaque section nomme le mécanisme employé.",
    contents: "Sur cette page",
    stepsTitle: "Comment cela se fait",
    limitsTitle: "Ce qui n’est pas couvert",
    more: "Retour au vote",
    methodsLink: "Modes de scrutin",
    topics: {
      secret: {
        title: "Bulletin anonyme",
        summary: "La réponse est conservée sans lien avec la personne qui l’a donnée.",
        body: [
          "Chaque bulletin est un enregistrement distinct. Il contient la réponse, un nombre aléatoire et l’identifiant du vote. Il ne contient aucune référence à un participant, et la liste des participants ne contient aucune référence à un bulletin. La liste conserve le jour où chaque participant a voté, et rien d’autre sur le vote.",
          "L’ordre d’arrivée des bulletins n’est pas publié. La liste publiée est triée par code de reçu, de sorte que l’ordre ne puisse pas être rapproché des moments où des personnes ont été vues en train de voter.",
        ],
        steps: [
          "Le participant ouvre un lien personnel. Le serveur retrouve l’entrée de la liste à partir d’une empreinte du lien.",
          "Le serveur marque l’entrée comme ayant voté et enregistre le jour.",
          "Le serveur conserve le bulletin sans référence à l’entrée.",
          "Lorsqu’un vote peut être modifié, un pseudonyme est conservé avec le bulletin. Il est calculé à partir d’un secret du serveur et de l’entrée, et permet au dernier bulletin d’une personne de remplacer les précédents. Il montre que deux bulletins viennent de la même personne, sans dire de qui il s’agit.",
        ],
        limits: [
          "Le serveur reçoit la réponse et le lien personnel dans la même requête. L’anonymat tient dans ce qui est conservé et affiché, et suppose que le serveur n’enregistre pas les deux ensemble. Un opérateur qui a un accès complet au serveur peut changer cela.",
          "Avec peu de participants et des résultats affichés pendant le vote, les totaux peuvent révéler le vote d’une personne. La console avertit lorsque moins de 5 adresses sont inscrites.",
          "Le pseudonyme d’un vote modifiable peut être recalculé par une personne qui détient le secret du serveur.",
        ],
      },
      named: {
        title: "Réponses nominatives",
        summary: "Chaque réponse est affichée à côté de la personne qui l’a donnée.",
        body: [
          "Dans un vote nominatif, le bulletin conserve une référence à l’entrée du participant. Les personnes autorisées à voir les résultats voient qui a répondu quoi, sous la forme que le vote fixe (voir la liste des signataires).",
          "Les participants en sont informés avant de voter, sur la page des règles du bulletin. Un vote ne peut pas passer de secret à nominatif après son ouverture.",
        ],
        steps: [
          "Le participant ouvre un lien personnel et lit la page des règles, qui indique que les réponses sont nominatives.",
          "Le serveur conserve le bulletin avec une référence à l’entrée de la liste.",
          "Lorsque le vote affiche la liste des réponses, chaque entrée est écrite selon le réglage du vote.",
        ],
        limits: [
          "Un vote nominatif n’offre aucun secret face aux administrateurs, qui voient l’entrée complète de chaque bulletin.",
          "La mention du nom vaut pour les personnes qui voient les résultats. Si les résultats sont publics, la liste l’est aussi, sous la forme choisie.",
        ],
      },
      list: {
        title: "Liste des signataires",
        summary: "Pour un vote nominatif, les administrateurs choisissent la présentation des noms et des adresses.",
        body: [
          "La liste des réponses d’un vote nominatif peut afficher le nom, l’adresse, les deux ou aucun. Chacun est affiché en entier, partiellement masqué ou non affiché, et toute combinaison est permise.",
          "Un nom est masqué en gardant le prénom et la première lettre du nom de famille: Marie Tremblay devient Marie T***. Une adresse est masquée en gardant la première et la dernière lettre de la partie avant l’arobase et du nom d’hôte, ainsi que la fin du domaine: marie.tremblay@example.org devient m***y@e***e.org. Le nombre d’astérisques ne suit jamais la longueur de ce qui est masqué.",
          "Les administrateurs voient toujours l’entrée complète. Les noms viennent de la liste des participants, où chaque entrée peut s’écrire Nom <adresse>.",
        ],
        steps: [
          "L’administrateur saisit les participants sous la forme Nom <adresse>, ou une adresse seule.",
          "Dans les réglages du vote, l’administrateur choisit la présentation du nom et de l’adresse.",
          "La page des règles du bulletin indique le réglage avant que quiconque vote. La page des résultats l’applique.",
        ],
        limits: [
          "Le masquage partiel rend une entrée plus difficile à lire, non impossible à deviner. Dans un petit groupe, un prénom et la première lettre d’un nom de famille peuvent suffire à reconnaître une personne.",
          "Un réglage qui n’affiche ni le nom ni l’adresse ne laisse aux participants que les totaux.",
        ],
      },
      sealed: {
        title: "Bulletins chiffrés",
        summary: "La réponse est chiffrée à la réception et ne peut être lue qu’avec la clé de dépouillement.",
        body: [
          "Le chiffrement garde les réponses illisibles pendant le vote, pour les administrateurs et pour toute personne qui a accès à la base de données.",
        ],
        steps: [
          "À l’ouverture du vote, le serveur crée une paire de clés. La clé publique est conservée avec le vote. La clé privée, appelée clé de dépouillement, est affichée une seule fois et n’est pas conservée.",
          "Chaque bulletin est chiffré avec la clé publique. Une nouvelle clé est convenue pour chaque bulletin (X25519), une clé symétrique en est dérivée (HKDF-SHA-256) et la réponse est chiffrée avec elle (AES-256-GCM).",
          "La réponse est complétée jusqu’à une longueur fixe avant le chiffrement, de sorte que la longueur d’un bulletin n’indique pas la réponse qu’il contient.",
          "À la fermeture, la clé de dépouillement est saisie. Le serveur déchiffre les bulletins en mémoire et enregistre les totaux.",
        ],
        limits: [
          "Le serveur chiffre le bulletin après l’avoir reçu et voit donc la réponse à ce moment. Le chiffrement protège ce qui est conservé, non ce qui est transmis.",
          "Au dépouillement, la clé est remise au serveur, qui lit les bulletins en mémoire.",
          "Si la clé de dépouillement est perdue, ou si le nombre de parts requis n’est plus réuni, les bulletins ne pourront jamais être lus et le scrutin n’aura aucun résultat. Personne, y compris le service, ne peut récupérer la clé.",
          "Ce n’est pas encore le schéma audité, avec une clé à seuil et une preuve de déchiffrement correct. Ce schéma est prévu.",
          "Les bulletins déposés avant l’ajout du remplissage ne sont pas complétés.",
        ],
      },
      "counting-key": {
        title: "Clé de dépouillement et parts",
        summary: "La clé qui ouvre les bulletins peut être divisée en parts détenues par plusieurs administrateurs.",
        body: [
          "Avec une seule clé, une personne peut ouvrir les bulletins. Avec des parts, la clé est divisée selon le partage de secret de Shamir en une part par administrateur, et un nombre fixé de parts, le seuil, doit être saisi ensemble pour ouvrir les bulletins. Un nombre de parts inférieur au seuil ne donne aucune information sur la clé.",
        ],
        steps: [
          "À l’ouverture du vote, la clé est divisée en parts. Chaque part est affichée une seule fois, à l’administrateur qui ouvre le vote, qui remet à chaque administrateur la sienne. Le serveur n’en garde aucune.",
          "À la fermeture, les administrateurs saisissent leurs parts. Lorsque le seuil est atteint, les bulletins s’ouvrent.",
        ],
        limits: [
          "Une part perdue compte contre le seuil. S’il reste moins de parts que le seuil, les bulletins restent fermés.",
          "Les parts passent par l’écran de l’administrateur qui ouvre le vote. Chaque administrateur est responsable de conserver la sienne.",
        ],
      },
      receipt: {
        title: "Reçu et registre",
        summary: "Chaque bulletin a un code de reçu. Les bulletins forment un registre dont la racine est publiée.",
        body: [
          "Après le vote, le participant reçoit un code de reçu calculé à partir de l’empreinte du bulletin conservé. Le code ne révèle pas la réponse.",
          "Les bulletins sont les entrées d’un arbre de Merkle. Sa racine est une valeur courte qui dépend de chaque bulletin. À la fermeture du vote, la racine et la liste des codes de reçu sont affichées. Un participant vérifie que son code figure dans la liste. Quiconque a conservé la racine d’un moment antérieur peut détecter un bulletin ajouté, retiré ou modifié depuis.",
        ],
        steps: [
          "Le serveur calcule l’empreinte du bulletin tel qu’il est conservé et en tire le code de reçu.",
          "Le bulletin est ajouté au registre. Le code est affiché au participant.",
          "À la fermeture, la liste des codes et la racine sont affichées. Le participant cherche son code.",
        ],
        limits: [
          "Le registre montre que rien de ce qui a été enregistré n’a été modifié ensuite. Il ne montre pas que la réponse a été enregistrée telle que le participant l’a donnée.",
          "Un participant ne voit sa propre réponse à côté de son code que si le vote publie son décompte.",
          "Un reçu envoyé par courriel associe l’adresse au code, dans la boîte de réception et chez le fournisseur de courriel. Lorsqu’un scrutin secret publie chaque bulletin à côté de son code, ce courriel permet à la personne qui le lit de retrouver la réponse. Le réglage est désactivé par défaut pour un scrutin secret.",
        ],
      },
      publication: {
        title: "Décompte publié",
        summary: "Après la fermeture, les bulletins sont affichés pour que chacun puisse recompter.",
        body: [
          "La liste publiée contient chaque bulletin avec son code de reçu et sa réponse, dans l’ordre des codes de reçu. Pour des bulletins chiffrés, les entrées du registre et la clé de dépouillement sont publiées aussi, de sorte que chacun puisse déchiffrer les bulletins et les additionner.",
        ],
        steps: [
          "Le vote se ferme et le décompte est fait.",
          "La liste des bulletins, la racine du registre et, pour des bulletins chiffrés, la clé de dépouillement sont affichées à tous ceux qui peuvent voir les résultats.",
          "Une personne qui veut recompter télécharge la liste, additionne les réponses et compare les totaux et la racine.",
        ],
        limits: [
          "Dans un vote anonyme, la liste affiche des réponses sans noms. Avec peu de votants, ou avec plusieurs questions où chaque bulletin est une combinaison rare, une personne qui sait comment quelqu’un a voté peut retrouver ce bulletin.",
          "Une fois publiée, la clé de dépouillement ne peut pas être retirée.",
        ],
      },
      approval: {
        title: "Approbation par les administrateurs",
        summary: "Dans une organisation qui compte plusieurs administrateurs, la publication et d’autres changements exigent un accord.",
        body: [
          "L’organisation fixe une règle: aucune, la majorité des administrateurs, ou tous. Avec deux administrateurs ou plus, une demande n’est jamais approuvée par une seule personne.",
          "Une approbation vaut pour une version exacte du vote, identifiée par une empreinte. Tout changement la fait recommencer. Le bulletin indique combien d’administrateurs ont approuvé, quand, et l’empreinte, de sorte qu’un participant puisse la comparer à ce qu’il a reçu.",
          "Chaque demande, réponse, décision et changement est écrit dans un registre où chaque entrée contient l’empreinte de la précédente. Un point de contrôle du registre peut être conservé ailleurs pour détecter une réécriture.",
        ],
        steps: [
          "Un administrateur demande la publication du vote. La demande nomme l’empreinte du vote.",
          "Les autres administrateurs lisent le vote et répondent: approuver, rejeter ou s’abstenir.",
          "Lorsque la règle est satisfaite, le vote est publié. Si le vote est modifié entre-temps, la demande est caduque.",
        ],
        limits: [
          "Les approbations sont enregistrées sur la foi de sessions ouvertes. Une signature avec des clés conservées dans le navigateur, que le serveur ne pourrait pas forger, est prévue.",
          "Avec deux administrateurs, les deux doivent être actifs. Si l’un perd sa clé, la reprise n’est pas encore construite.",
        ],
      },
    },
  },
  methods: {
    title: "Modes de scrutin",
    lede: "Des modes issus de la théorie du vote et des sondages, avec la façon dont chacun compte et ses limites. Deux sont offerts. Les autres sont décrits pour que le plan puisse être lu et discuté.",
    contents: "Modes",
    built: "Offert",
    planned: "Prévu",
    howTitle: "Comment le gagnant est trouvé",
    limitsTitle: "Limites",
    howLink: "Comment le bulletin et le décompte sont protégés",
    infoLabel: "À propos de ce mode",
    note: "Un mode prévu n’est pas offert à la création d’un vote. Le plan et son ordre figurent dans la décision 0011 du projet.",
    families: {
      decision: { title: "Choisir entre des options", text: "Un seul gagnant. Le bulletin et le décompte varient selon le mode, de même que le traitement d’un résultat serré." },
      seats: { title: "Pourvoir plusieurs sièges", text: "Plusieurs gagnants, pour des conseils, des comités et des conseils d’administration." },
      opinion: { title: "Répartition et sondage d’opinion", text: "Des points à répartir, des échelles et des réponses libres. Certains de ces sondages ne désignent aucun gagnant." },
    },
    list: {
      "yes-no": {
        name: "Pour, contre ou abstention",
        summary: "Une proposition est adoptée ou rejetée. Chaque participant répond pour, contre, ou s’abstient.",
        how: ["Les bulletins sont comptés pour chacune des trois réponses.", "La réponse qui a le plus de bulletins est en tête. Les règles de fermeture peuvent fixer un quorum ou un seuil."],
        limits: ["Le décompte ne dit pas si les abstentions aident ou nuisent: les règles de l’organisation en décident."],
      },
      single: {
        name: "Un choix, scrutin majoritaire à un tour",
        summary: "Chaque participant choisit une option. L’option qui a le plus de bulletins est en tête.",
        how: ["Chaque participant choisit une option.", "Les bulletins sont comptés pour chaque option.", "L’option qui a le plus de bulletins est en tête. Une égalité est signalée comme telle."],
        limits: ["Une majorité n’est pas exigée. Avec de nombreuses options semblables, les votes se divisent et une option que la plupart des participants classent bas peut arriver en tête."],
      },
      majority: {
        name: "Seuil de majorité",
        summary: "Une option l’emporte seulement avec plus de la moitié des bulletins déposés, ou avec une autre part fixée.",
        how: ["Le décompte est celui d’un choix parmi plusieurs.", "Si aucune option n’atteint la part, le résultat est nul."],
        limits: ["Exige une règle pour la suite d’un résultat nul, comme un second tour."],
      },
      "two-round": {
        name: "Deux tours",
        summary: "Un second tour oppose les deux options en tête lorsqu’aucune ne dépasse une part au premier.",
        how: ["Le premier tour compte un choix par participant.", "Si aucune option ne dépasse la part, les deux options en tête, ou celles au-dessus d’une part fixée, passent au second tour.", "L’option qui a le plus de bulletins au second tour l’emporte."],
        limits: ["Exige un second vote et un second délai. La participation baisse souvent entre les tours."],
      },
      approval: {
        name: "Vote par approbation",
        summary: "Chaque participant approuve autant d’options qu’il en accepte. L’option approuvée par le plus de participants l’emporte.",
        how: ["Chaque participant coche toutes les options qu’il accepte.", "Les approbations sont comptées pour chaque option.", "L’option qui a le plus d’approbations l’emporte."],
        limits: ["Un bulletin ne montre pas l’intensité d’une préférence. Un participant qui approuve toutes les options n’apporte aucune information."],
      },
      ranked: {
        name: "Vote préférentiel, report instantané",
        summary: "Les participants classent les options. Les options qui ont le moins de premiers choix sont retirées et leurs bulletins passent au choix suivant.",
        how: ["Chaque participant classe les options par ordre.", "Les premiers choix sont comptés. Si une option dépasse la moitié, elle l’emporte.", "Sinon, l’option qui a le moins de premiers choix est retirée et ses bulletins passent à leur choix suivant. Le décompte recommence."],
        limits: ["Dans de rares cas, un candidat peut perdre en gagnant des appuis. Le décompte se fait par tours et demande plus de temps à lire.", "Des bulletins classés publiés peuvent identifier un votant lorsque les options sont nombreuses."],
      },
      condorcet: {
        name: "Méthodes de Condorcet",
        summary: "Les participants classent les options. Les options sont comparées deux à deux, et l’option qui bat toutes les autres l’emporte.",
        how: ["Chaque participant classe les options par ordre.", "Pour chaque paire, les bulletins qui préfèrent l’une à l’autre sont comptés.", "Une option qui gagne toutes ses paires l’emporte. Si aucune n’y parvient, une règle énoncée (Schulze ou paires classées) en désigne une."],
        limits: ["Les résultats sont présentés dans un tableau de paires, qui demande une explication.", "Des bulletins classés publiés peuvent identifier un votant lorsque les options sont nombreuses."],
      },
      borda: {
        name: "Compte de Borda",
        summary: "Les participants classent les options. Chaque rang donne des points, et les points sont additionnés.",
        how: ["Chaque participant classe les options par ordre.", "La première place donne le plus de points, la dernière aucun.", "Les points sont additionnés pour chaque option. Le plus grand total l’emporte."],
        limits: ["L’ajout d’options semblables peut changer le résultat."],
      },
      score: {
        name: "Vote par note",
        summary: "Chaque participant donne à chaque option une note sur une échelle numérique. Les notes sont additionnées.",
        how: ["Chaque participant donne à chaque option une note, par exemple de 0 à 5.", "Les notes sont additionnées pour chaque option.", "Le plus grand total l’emporte."],
        limits: ["Les participants n’emploient pas l’échelle de la même façon. Certains donnent des notes extrêmes pour peser davantage."],
      },
      grading: {
        name: "Jugement majoritaire",
        summary: "Chaque participant donne à chaque option une mention sur une échelle verbale. L’option dont la mention médiane est la meilleure l’emporte.",
        how: ["Chaque participant donne à chaque option une mention, par exemple de Excellent à À rejeter.", "Pour chaque option, la mention médiane est trouvée: la moitié des participants lui ont donné cette mention ou une meilleure.", "L’option dont la médiane est la meilleure l’emporte. Une égalité est départagée en retirant la mention médiane de chaque option à égalité, puis en comparant de nouveau."],
        limits: ["Le résultat est présenté comme une répartition des mentions pour chaque option, ce qui demande plus de lecture qu’un total.", "Des bulletins notés publiés peuvent identifier un votant lorsque les options sont nombreuses."],
      },
      star: {
        name: "Vote STAR",
        summary: "Les participants notent les options. Les deux qui ont les plus grands totaux passent à un second tour décidé par les bulletins.",
        how: ["Chaque participant donne une note à chaque option.", "Les notes sont additionnées. Les deux options aux plus grands totaux passent au second tour.", "De ces deux options, celle que plus de participants ont mieux notée l’emporte."],
        limits: ["Exige à la fois des notes et un décompte des préférences, ce qui demande une explication."],
      },
      consent: {
        name: "Consentement",
        summary: "Une proposition est adoptée lorsqu’aucun participant ne maintient d’objection motivée après discussion.",
        how: ["Une proposition est présentée et les questions reçoivent réponse.", "Chaque participant répond: consentement, objection ou abstention.", "La proposition est adoptée si aucune objection ne subsiste après discussion."],
        limits: ["Exige une étape de discussion, qui n’est pas construite."],
      },
      block: {
        name: "Vote en bloc",
        summary: "Chaque participant vote pour autant d’options qu’il y a de sièges. Les options qui ont le plus de bulletins l’emportent.",
        how: ["Chaque participant choisit autant d’options qu’il y a de sièges.", "Les options qui ont le plus de bulletins remportent les sièges."],
        limits: ["Un groupe majoritaire peut remporter tous les sièges."],
      },
      stv: {
        name: "Vote unique transférable",
        summary: "Les participants classent les options. Les voix excédentaires et celles des options retirées passent au choix suivant jusqu’à ce que les sièges soient pourvus.",
        how: ["Chaque participant classe les options par ordre.", "Un quota est calculé d’après le nombre de bulletins et de sièges.", "Une option qui atteint le quota remporte un siège, et son excédent est reporté. L’option qui a le moins de voix est retirée et ses bulletins sont reportés. Le décompte recommence jusqu’à ce que les sièges soient pourvus."],
        limits: ["Le décompte est long et exige une référence éprouvée.", "Des bulletins classés publiés peuvent identifier un votant lorsque les options sont nombreuses."],
      },
      lists: {
        name: "Listes proportionnelles",
        summary: "Chaque participant vote pour une liste. Les sièges sont répartis entre les listes en proportion de leurs voix.",
        how: ["Chaque participant choisit une liste.", "Les sièges sont répartis par une méthode du plus fort reste ou du diviseur (D’Hondt ou Sainte-Laguë)."],
        limits: ["La méthode choisie change le sort des petites listes."],
      },
      allocation: {
        name: "Répartition de points",
        summary: "Chaque participant répartit un budget de points entre les options. Les points sont additionnés.",
        how: ["Chaque participant reçoit un budget, par exemple 100 points.", "Chacun le répartit entre les options.", "Les points sont additionnés pour chaque option."],
        limits: ["Sert au budget participatif et aux priorités. Le sondage ne désigne aucun gagnant, sauf si un est fixé."],
      },
      quadratic: {
        name: "Vote quadratique",
        summary: "Chaque participant achète des voix avec un budget, et chaque voix ajoutée sur une même option coûte plus que la précédente.",
        how: ["Chaque participant reçoit un budget de crédits.", "Une voix sur une option coûte un crédit, deux voix en coûtent quatre, trois en coûtent neuf.", "Les voix sont additionnées pour chaque option."],
        limits: ["Ne fonctionne que si une personne détient exactement un budget. Cela exige une vérification stricte de l’identité."],
      },
      rating: {
        name: "Échelle d’évaluation",
        summary: "Chaque participant évalue des énoncés sur une échelle, par exemple de tout à fait en désaccord à tout à fait d’accord.",
        how: ["Chaque participant évalue chaque énoncé.", "La répartition des évaluations est présentée pour chaque énoncé."],
        limits: ["Un sondage d’opinion. Il ne désigne aucun gagnant."],
      },
      text: {
        name: "Texte libre ou nombre",
        summary: "Chaque participant écrit un court texte ou saisit un nombre.",
        how: ["Chaque participant répond dans une case.", "Les réponses sont listées, ou un nombre est additionné ou moyenné."],
        limits: ["Un texte libre peut identifier son auteur. Le sondage l’indique avant qu’on y réponde."],
      },
    },
  },
};

export const guideMessages: Readonly<Record<Locale, GuideMessages>> = { fr, en };
