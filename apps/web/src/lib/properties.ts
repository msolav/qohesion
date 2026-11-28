// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The settings of a poll as a list of properties, each with its own icon, its badge and its description. The ballot's
 * rules page and the builder's review step both read this list, so that what an administrator reviews is what a
 * participant is shown. Descriptions come from the texts of the settings themselves, so they cannot drift apart.
 */

import type { CloseRules } from "./close-rules.js";
import { signatoryLabel, showsNobody, type Disclosure } from "./disclosure.js";
import { consoleMessages, fill, rulesSentence } from "./i18n/console.js";
import { guideMessages, type PropertyId, type TopicId } from "./i18n/guide.js";
import type { Locale } from "./i18n/negotiate.js";
import type { MethodId } from "./methods.js";
import type { ResultsAudience, ResultsTiming } from "./results-rules.js";

/** How a property looks: protected, exposed, plain, or fixed. Each has its own border and tint, so colour is never the only cue. */
export type Tone = "private" | "open" | "neutral" | "strict";

export interface Property {
  readonly id: PropertyId;
  readonly icon: string;
  readonly tone: Tone;
  readonly label: string;
  readonly badges: readonly string[];
  readonly text: readonly string[];
  /** The page that explains it: a topic of /how, or a method of /methods. */
  readonly learn: { readonly page: "how" | "methods"; readonly anchor: string } | null;
}

export interface PropertyInput {
  /** One entry for each question, in order. */
  readonly questionTypes: readonly ("yes-no" | "single")[];
  readonly anonymity: "secret" | "named";
  readonly encrypted: boolean;
  readonly timing: ResultsTiming;
  readonly audience: ResultsAudience;
  readonly allowChange: boolean;
  readonly lateRoll: boolean;
  readonly publishCount: boolean;
  readonly lockCancel: boolean;
  /** Whether a participant can ask for the receipt code by email. */
  readonly emailReceipt: boolean;
  /** Whether the roll shows who has voted. Always true for a named poll. */
  readonly showVoted: boolean;
  readonly disclosure: Disclosure | null;
  readonly rules: CloseRules;
  /** The closing moment, already written for the reader, or null when there is none. */
  readonly closes: string | null;
  /** The size of the roll and its code, known on the ballot and not yet in the builder. */
  readonly roll?: { readonly count: number | null; readonly code: string | null };
  /** How the poll was approved, already written. Absent in the builder. */
  readonly approval?: { readonly badge: string; readonly lines: readonly string[] };
  /** Whether a known list of names could be shown: the builder says so when no entry has a name. */
  readonly example?: { readonly name: string | null; readonly address: string };
}

/** The type of a question as the ballot knows it, from its options: a yes-no question has the three fixed ones. */
export function typeOfOptions(options: readonly { readonly id: string }[]): "yes-no" | "single" {
  const ids = options.map((o) => o.id).sort().join(",");
  return ids === "abstain,against,for" ? "yes-no" : "single";
}

export function methodOfProperty(type: "yes-no" | "single"): MethodId {
  return type;
}

export function propertiesOf(locale: Locale, p: PropertyInput): Property[] {
  const m = consoleMessages[locale];
  const g = guideMessages[locale];
  const out: Property[] = [];
  const named = p.anonymity === "named";
  const add = (id: PropertyId, icon: string, tone: Tone, badges: readonly string[], text: readonly string[], learn: Property["learn"]): void => {
    out.push({ id, icon, tone, label: g.props.labels[id], badges, text: text.filter((t) => t !== ""), learn });
  };

  // The method of the question, or of each question when they differ.
  const first = p.questionTypes[0] ?? "yes-no";
  if (p.questionTypes.length > 1) {
    add("method", "list", "neutral", [fill(g.props.methodMany.badge, { n: p.questionTypes.length })], [fill(g.props.methodMany.text, { n: p.questionTypes.length })], { page: "methods", anchor: methodOfProperty(first) });
  } else {
    add("method", first === "yes-no" ? "check" : "flag", "neutral", [g.props.method[first].badge], [g.props.method[first].text], { page: "methods", anchor: methodOfProperty(first) });
  }

  add("closing", "clock", "neutral", [p.closes ?? m.voter.noClose], [p.closes === null ? g.props.texts.closingNone : g.props.closingPlain, rulesSentence(m, p.rules)], null);

  const roll = p.roll;
  const rollBadge = roll === undefined || roll.count === null ? g.props[p.lateRoll ? "rollLate" : "rollFixed"] : roll.count === 1 ? m.voter.rollOne : fill(m.voter.rollValue, { n: roll.count });
  add("roll", "users", p.lateRoll ? "open" : "neutral", [rollBadge], [roll?.code ? fill(g.props.texts.roll.note, { code: roll.code }) : "", p.lateRoll ? g.props.texts.roll.late : g.props.texts.roll.fixed], null);

  const hiddenVoters = !named && !p.showVoted;
  add("ballot", named ? "users" : hiddenVoters ? "mask" : "ballot", named ? "open" : "private", [named ? m.voter.namedValue : m.form.anonymityNames.title[hiddenVoters ? "anonymous" : "voters"]], [named ? fill(g.props.texts.named, { who: m.voter.namedWho[p.audience] }) : hiddenVoters ? g.props.texts.secret : g.props.texts.secretVoters], { page: "how", anchor: named ? "named" : "secret" });

  if (named && p.disclosure) {
    const d = p.disclosure;
    const sample = p.example ?? { name: "Marie Tremblay", address: "marie.tremblay@example.org" };
    const what = [g.disclosure.nameModes[d.name].phrase, g.disclosure.emailModes[d.email].phrase].filter((t) => t !== "").join(` ${g.disclosure.and} `);
    const badge = showsNobody(d) ? g.props.listNobody : signatoryLabel(sample, d);
    add("list", "list", "open", [badge], [showsNobody(d) ? g.props.listNothing : fill(g.props.listText, { what })], { page: "how", anchor: "list" });
  }

  add("seal", p.encrypted ? "lock" : "unlock", p.encrypted ? "private" : "open", [p.encrypted ? m.seal.factSealed : m.seal.factPlain], [p.encrypted ? g.props.texts.seal.sealed : named ? g.props.texts.seal.plainNamed : g.props.texts.seal.plainSecret], { page: "how", anchor: p.encrypted ? "sealed" : "secret" });

  add("change", "pulse", p.allowChange ? "neutral" : "strict", [p.allowChange ? g.props.changeAllowed : g.props.changeFinal], [p.allowChange ? g.props.texts.change.allowed : g.props.texts.change.final], null);

  const rm = g.props.receiptMail;
  add("receipt", "mail", p.emailReceipt ? "open" : "neutral", [p.emailReceipt ? rm.on : rm.off], [p.emailReceipt ? rm.onText : rm.offText, p.emailReceipt && !named && p.publishCount ? rm.tiesText : ""], { page: "how", anchor: "receipt" });

  add("results", "eye", "neutral", [m.form.timingNames.title[p.timing], m.form.audienceNames.title[p.audience]], [g.props.texts.results[p.timing][p.audience]], { page: "how", anchor: "receipt" });

  add("publication", "hash", p.publishCount ? "open" : "neutral", [p.publishCount ? g.props.publication.badge : g.props.publication.off.badge], [p.publishCount ? g.props.publication.text : g.props.publication.off.text], { page: "how", anchor: "publication" });
  add("cancel", "flag", p.lockCancel ? "strict" : "neutral", [p.lockCancel ? g.props.cancel.badge : g.props.cancel.off.badge], [p.lockCancel ? g.props.cancel.text : g.props.cancel.off.text], null);
  if (p.approval) add("approval", "approved", "private", [p.approval.badge], p.approval.lines, { page: "how", anchor: "approval" satisfies TopicId });
  return out;
}

/** The address of the page that explains a property. The language travels with the link so that the page opens in it. */
export function learnHref(locale: Locale, learn: NonNullable<Property["learn"]>): string {
  return `/${learn.page}?lang=${locale}#${learn.anchor}`;
}
