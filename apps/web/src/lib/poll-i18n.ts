// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * The content of a poll in several languages. The question, its details and the text of each option can be written in
 * every language the administrators offer, and a member sees the language they have chosen, or the poll's default
 * language when theirs is not offered. The first language of the list is the default.
 */

export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];

export interface Translations {
  /** Languages offered, the default first. Empty for a poll written before translations existed. */
  readonly languages: readonly Lang[];
  readonly title: Readonly<Partial<Record<Lang, string>>>;
  readonly question: Readonly<Partial<Record<Lang, string>>>;
  readonly description: Readonly<Partial<Record<Lang, string>>>;
  /** The text of each option, by position, in each language. */
  readonly options: readonly Readonly<Partial<Record<Lang, string>>>[];
  /** The texts of questions 2 to n, by question id (ADR 0010). Absent for a poll of one question. */
  readonly questions?: Readonly<Record<string, { readonly question: Readonly<Partial<Record<Lang, string>>>; readonly options: readonly Readonly<Partial<Record<Lang, string>>>[] }>>;
}

export const NO_TRANSLATIONS: Translations = { languages: [], title: {}, question: {}, description: {}, options: [] };

export const isLang = (value: unknown): value is Lang => typeof value === "string" && (LANGS as readonly string[]).includes(value);

/** The languages offered, without repeats and without unknown ones, keeping the order (the first is the default). */
export function cleanLanguages(list: readonly unknown[]): Lang[] {
  const out: Lang[] = [];
  for (const l of list) if (isLang(l) && !out.includes(l)) out.push(l);
  return out;
}

/** The language a member is shown: theirs when it is offered, else the default of the poll, else theirs. */
export function languageFor(t: Translations, wanted: Lang): Lang {
  if (t.languages.length === 0) return wanted;
  return t.languages.includes(wanted) ? wanted : (t.languages[0] ?? wanted);
}

/**
 * Something that is missing in an offered language: "title", or "option 3". Used to refuse a poll that would show a
 * member an empty question or option. Only language 1 of a single-language poll needs nothing here.
 */
export function missingTexts(t: Translations, optionCount: number, extra: readonly { id: string; optionCount: number }[] = []): string[] {
  const missing: string[] = [];
  for (const lang of t.languages) {
    for (const q of extra) {
      const texts = t.questions?.[q.id];
      if (!(texts?.question[lang] ?? "").trim()) missing.push(`${q.id}.question:${lang}`);
      for (let i = 0; i < q.optionCount; i++) if (!(texts?.options[i]?.[lang] ?? "").trim()) missing.push(`${q.id}.option${i + 1}:${lang}`);
    }
    if (!(t.title[lang] ?? "").trim()) missing.push(`title:${lang}`);
    if (!(t.question[lang] ?? "").trim()) missing.push(`question:${lang}`);
    for (let i = 0; i < optionCount; i++) if (!(t.options[i]?.[lang] ?? "").trim()) missing.push(`option${i + 1}:${lang}`);
  }
  return missing;
}

export interface Localizable {
  readonly title: string;
  readonly question: string;
  readonly description: string;
  readonly options: readonly { readonly id: string; readonly label: string | null; readonly icon?: string | null; readonly color?: string | null }[];
  readonly translations: Translations;
  readonly questions?: readonly { readonly id: string; readonly type: string; readonly prompt: string; readonly options: readonly { readonly id: string; readonly label: string | null; readonly icon?: string | null; readonly color?: string | null }[] }[];
}

/** The poll as a member of one language reads it. Missing texts fall back to the default language, then to what was typed first. */
export function localize<P extends Localizable>(poll: P, wanted: Lang): { title: string; question: string; description: string; options: P["options"][number][]; questions: LocalizedQuestion[] } {
  const t = poll.translations;
  const lang = languageFor(t, wanted);
  const def = t.languages[0];
  const text = (map: Readonly<Partial<Record<Lang, string>>>, fallback: string): string => (map[lang] ?? "").trim() || (def ? (map[def] ?? "").trim() : "") || fallback;
  return {
    title: text(t.title, poll.title),
    question: text(t.question, poll.question),
    description: text(t.description, poll.description),
    options: poll.options.map((o, i) => (o.label === null ? o : { ...o, label: text(t.options[i] ?? {}, o.label) })),
    // Every question as the member reads it. Question 1 reads from the fields above; the others from `translations.questions`.
    questions: (poll.questions ?? []).map((q, n) => {
      if (n === 0) return { id: q.id, type: q.type, prompt: text(t.question, poll.question), options: poll.options.map((o, i) => (o.label === null ? o : { ...o, label: text(t.options[i] ?? {}, o.label) })) };
      const own = t.questions?.[q.id];
      return { id: q.id, type: q.type, prompt: text(own?.question ?? {}, q.prompt), options: q.options.map((o, i) => (o.label === null ? o : { ...o, label: text(own?.options[i] ?? {}, o.label) })) };
    }),
  };
}

export interface LocalizedQuestion {
  readonly id: string;
  readonly type: string;
  readonly prompt: string;
  readonly options: { readonly id: string; readonly label: string | null; readonly icon?: string | null; readonly color?: string | null }[];
}
