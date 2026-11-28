<script lang="ts">
  import { tick } from "svelte";
  import BallotView from "#lib/components/BallotView.svelte";
  import GuideLink from "#lib/components/GuideLink.svelte";
  import PropertyList from "#lib/components/PropertyList.svelte";
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { DEFAULT_DISCLOSURE, EMAIL_MODES, NAME_MODES, maskEmail, maskName, type EmailMode, type NameMode } from "#lib/disclosure.js";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import { guideMessages } from "#lib/i18n/guide.js";
  import { learnHref, propertiesOf } from "#lib/properties.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { COLOR_IDS, ICON_IDS, ICONS, COLORS, colorName, iconName } from "#lib/option-style.js";
  import { AUDIENCES, TIMINGS, type Anonymity, type ResultsAudience, type ResultsTiming } from "#lib/results-rules.js";
  import { LANGS, type Lang } from "#lib/poll-i18n.js";
  import type { PollInput } from "#lib/server/service.js";
  import { THEMES, THEME_NAMES, type Theme } from "#lib/theme.js";
  import { DEFAULT_TIME_ZONE, utcToLocalInput, zonedToUtc } from "#lib/zoned.js";

  let {
    locale,
    submit,
    initial,
    error,
    defaultTheme,
    timeZone = DEFAULT_TIME_ZONE,
    defaultCloses = "",
    administrators = 1,
  }: { locale: Locale; submit: string; initial: PollInput | null; error: string | null; defaultTheme: Theme; timeZone?: string; defaultCloses?: string; administrators?: number } = $props();

  const m = $derived(consoleMessages[locale]);
  const g = $derived(guideMessages[locale]);
  const start = (() => initial)();

  type Texts = Record<Lang, string>;
  const blank = (): Texts => ({ fr: "", en: "" });
  interface Row {
    key: number;
    /** The text of the option in each language. */
    texts: Texts;
    icon: string;
    color: string;
    open: boolean;
  }
  let nextKey = 0;
  const row = (texts: Partial<Texts> = {}, icon = "", color = ""): Row => ({ key: nextKey++, texts: { ...blank(), ...texts }, icon, color, open: false });
  const t0 = start?.translations;

  // Everything typed or chosen lives in state, so it survives a change of language and any refresh of the page.
  let step = $state(0);
  // The languages offered, the default first. A new poll starts in the language of the screen.
  const ui = (() => locale)();
  const startLangs: Lang[] = t0 && t0.languages.length > 0 ? [...t0.languages] : [ui];
  let languages = $state<Lang[]>(startLangs);
  const def = $derived(languages[0] ?? ui);
  let editing = $state<Lang>(startLangs[0] ?? ui);
  let titles = $state<Texts>({ ...blank(), ...(t0?.title ?? {}), ...(t0 && t0.languages.length > 0 ? {} : { [ui]: start?.title ?? "" }) });
  let questions = $state<Texts>({ ...blank(), ...(t0?.question ?? {}), ...(t0 && t0.languages.length > 0 ? {} : { [ui]: start?.question ?? "" }) });
  let descriptions = $state<Texts>({ ...blank(), ...(t0?.description ?? {}), ...(t0 && t0.languages.length > 0 ? {} : { [ui]: start?.description ?? "" }) });
  let markFillValue = $state<"outline" | "fill">(start?.markFill ? "fill" : "outline");
  const markFill = $derived(markFillValue === "fill");
  let kind = $state<"yes-no" | "choice">(start?.kind ?? "yes-no");
  interface Extra {
    key: number;
    kind: "yes-no" | "choice";
    texts: Texts;
    rows: { key: number; texts: Texts }[];
  }
  let extraKey = 100;
  const newExtraRow = (texts: Partial<Texts> = {}) => ({ key: extraKey++, texts: { ...blank(), ...texts } });
  // Questions 2 to n of a poll being edited, with their texts in every language offered.
  let extras = $state<Extra[]>(
    (start?.extraQuestions ?? []).map((q, n) => {
      const own = t0?.questions?.[`q${n + 2}`];
      const plain = !(t0 && t0.languages.length > 0);
      return {
        key: extraKey++,
        kind: q.type === "single" ? ("choice" as const) : ("yes-no" as const),
        texts: { ...blank(), ...(own?.question ?? {}), ...(plain ? { [ui]: q.prompt } : {}) },
        rows: (q.type === "single" ? q.options : []).map((o, j) => newExtraRow({ ...(own?.options[j] ?? {}), ...(plain ? { [ui]: o.label } : {}) })),
      };
    }),
  );
  function addQuestion(): void {
    if (extras.length >= 19) return;
    extras.push({ key: extraKey++, kind: "yes-no", texts: blank(), rows: [newExtraRow(), newExtraRow()] });
  }
  function removeQuestion(i: number): void {
    extras.splice(i, 1);
  }
  function moveQuestion(from: number, to: number): void {
    if (to < 0 || to >= extras.length) return;
    const [item] = extras.splice(from, 1);
    if (item) extras.splice(to, 0, item);
  }
  let rows = $state<Row[]>(start && start.options.length > 0 ? start.options.map((o, i) => row({ ...(t0?.options[i] ?? {}), ...(t0 && t0.languages.length > 0 ? {} : { [ui]: o.label ?? "" }) }, o.icon ?? "", o.color ?? "")) : [row(), row(), row()]);
  let timing = $state<ResultsTiming>(start?.timing ?? "close");
  let audience = $state<ResultsAudience>(start?.audience ?? "voters");
  let anonymity = $state<Anonymity>(start?.anonymity ?? "secret");
  let encryption = $state<"sealed" | "none">(start ? (start.encrypted ? "sealed" : "none") : "sealed");
  const zone = (() => timeZone)();
  let opensMode = $state<"manual" | "date">(start?.opensAt ? "date" : "manual");
  let opensAt = $state(start?.opensAt ? utcToLocalInput(start.opensAt, zone) : "");
  let closesAt = $state(start?.closesAt ? utcToLocalInput(start.closesAt, zone) : (() => defaultCloses)());
  let ruleVotes = $state(start?.rules.afterVotes != null);
  let ruleVotesN = $state(String(start?.rules.afterVotes ?? 10));
  let ruleTurnout = $state(start?.rules.turnoutPercent != null);
  let ruleTurnoutP = $state(String(start?.rules.turnoutPercent ?? 100));
  let ruleThreshold = $state<"none" | "majority" | "percent">(start?.rules.threshold == null ? "none" : start.rules.threshold === "majority" ? "majority" : "percent");
  let ruleThresholdP = $state(String(typeof start?.rules.threshold === "number" ? start.rules.threshold : 60));
  let allowChange = $state(start?.allowChange ?? false);
  let keyMode = $state<"one" | "shared">((start?.keyThreshold ?? 1) > 1 ? "shared" : "one");
  let keyThreshold = $state(String(Math.max(2, start?.keyThreshold ?? 2)));
  let discName = $state<NameMode>(start?.disclosure?.name ?? DEFAULT_DISCLOSURE.name);
  let discEmail = $state<EmailMode>(start?.disclosure?.email ?? DEFAULT_DISCLOSURE.email);
  let publishCount = $state(start?.publishCount ?? false);
  // Email receipts follow the anonymity until the administrator sets them: on for a named poll, off for a secret one.
  let emailReceipt = $state(start?.emailReceipt ?? (start?.anonymity ?? "secret") === "named");
  let emailReceiptSet = $state(start?.emailReceipt !== undefined);
  // Whether the roll shows who has voted. A new secret poll starts without it; the choice is made with the answers' privacy.
  let showVoted = $state(start?.showVoted ?? false);
  type Privacy = "anonymous" | "voters" | "named";
  const privacy = $derived<Privacy>(anonymity === "named" ? "named" : showVoted ? "voters" : "anonymous");
  function setPrivacy(value: Privacy): void {
    anonymity = value === "named" ? "named" : "secret";
    showVoted = value !== "anonymous";
  }
  $effect(() => { if (!emailReceiptSet) emailReceipt = anonymity === "named"; });
  // Reminders go to those who have not voted, which a roll that does not show who has voted cannot tell.
  $effect(() => { if (privacy === "anonymous") autoReminder = "none"; });
  let lockCancel = $state(start?.lockCancel ?? false);
  let paged = $state(start?.paged ?? true);
  let lateRoll = $state(start?.lateRoll ?? false);
  let autoReminder = $state<"none" | "daily" | "before_close">(start?.autoReminder ?? "none");
  let reminderPermission = $state(start?.reminderPermission ?? false);
  let theme = $state<Theme>(start?.theme ?? (() => defaultTheme)());
  let enhanced = $state(false);
  let problem = $state<string | null>(null);
  let announce = $state("");
  let armed = $state<number | null>(null);
  let dragFrom = $state<number | null>(null);

  const STEPS = ["template", "question", "choices", "results", "closing", "review"] as const;
  const last = STEPS.length - 1;

  $effect(() => {
    enhanced = true;
  });
  // At least one language stays; the language being edited is always one of those offered.
  $effect(() => {
    if (languages.length === 0) languages = [ui];
    if (!languages.includes(editing)) editing = languages[0] ?? ui;
  });
  // Live totals need readable ballots, so choosing them turns encryption off.
  $effect(() => {
    if (timing === "live") encryption = "none";
  });
  type Preset = "secret" | "verifiable" | "open";
  /** A preset fills in the results settings in one choice. Each setting can still be changed afterwards. */
  function applyPreset(id: Preset): void {
    if (id === "open") {
      timing = "live"; audience = "voters"; anonymity = "named"; showVoted = true; encryption = "none"; publishCount = false; lockCancel = false; lateRoll = true;
      discName = "full"; discEmail = "full";
    } else {
      lateRoll = false;
      timing = "close"; anonymity = "secret"; showVoted = false; encryption = "sealed";
      audience = id === "verifiable" ? "anyone" : "voters";
      publishCount = id === "verifiable"; lockCancel = id === "verifiable";
    }
  }
  /** The preset that the current settings match exactly, or null when they are custom. */
  const matchedPreset = $derived<Preset | null>(
    timing === "close" && anonymity === "secret" && !showVoted && encryption === "sealed" && audience === "voters" && !publishCount && !lockCancel
      ? "secret"
      : timing === "close" && anonymity === "secret" && !showVoted && encryption === "sealed" && audience === "anyone" && publishCount && lockCancel
        ? "verifiable"
        : timing === "live" && anonymity === "named" && encryption === "none" && audience === "voters" && !publishCount && !lockCancel
          ? "open"
          : null,
  );
  // A threshold reads the totals, and a changed vote needs a pseudonym: the first needs readable ballots, the second sealed ones.
  $effect(() => {
    if (encryption === "sealed" || extras.length > 0) ruleThreshold = "none";
    if (encryption !== "sealed") allowChange = false;
  });
  // A refusal from the server sends the person to the step that holds the problem.
  $effect(() => {
    if (!error) return;
    step = error.startsWith("title") || error === "translation_missing" || error === "description_too_long" ? 1 : error.startsWith("option") ? 2 : ["closes_required", "closes_past", "dates_order", "opens_past", "invalid_rule", "rules_need_readable", "change_needs_encryption", "attestation_required"].includes(error) ? 4 : 3;
  });

  const labels = $derived(rows.map((r) => r.texts[def].trim()).filter((l) => l.length > 0));
  const shown = (texts: Texts): string => texts[editing].trim() || texts[def].trim();
  const langName = (l: Lang): string => (l === "fr" ? "Français" : "English");
  /** What is still missing in a language: the question, or an option the default language has. */
  const gaps = (l: Lang): boolean => titles[l].trim() === "" || questions[l].trim() === "" || rows.some((r) => r.texts[def].trim() !== "" && r.texts[l].trim() === "");
  const previewRules = $derived({
    afterVotes: ruleVotes && /^\d+$/.test(ruleVotesN) ? Number(ruleVotesN) : null,
    turnoutPercent: ruleTurnout && /^\d+$/.test(ruleTurnoutP) ? Number(ruleTurnoutP) : null,
    threshold: ruleThreshold === "majority" ? ("majority" as const) : ruleThreshold === "percent" && /^\d+$/.test(ruleThresholdP) ? Number(ruleThresholdP) : null,
  });
  const preview = $derived({
    title: shown(titles),
    question: shown(questions),
    description: shown(descriptions),
    options:
      kind === "choice"
        ? rows.map((r) => ({ id: `p${r.key}`, label: shown(r.texts) || null, icon: r.icon || null, color: r.color || null }))
        : [{ id: "for", label: null }, { id: "against", label: null }, { id: "abstain", label: null }],
    timing,
    audience,
    encrypted: encryption === "sealed",
    markFill,
    anonymity,
    allowChange,
    lateRoll,
    publishCount,
    lockCancel,
    emailReceipt,
    showVoted,
    disclosure: { name: discName, email: discEmail },
    rules: previewRules,
    timeZone: zone,
    closesAt: zonedToUtc(closesAt, zone),
    rollCount: null,
    rollCode: null,
  });
  const serverError = $derived(error ? errorText(m, error) : "");
  const sampleName = "Marie Tremblay";
  const sampleAddress = "marie.tremblay@example.org";
  /** The settings as the review step lists them: the same rows the ballot's rules page shows. */
  const properties = $derived(
    propertiesOf(locale, {
      questionTypes: [kind === "choice" ? "single" : "yes-no", ...extras.map((e) => (e.kind === "choice" ? ("single" as const) : ("yes-no" as const)))],
      anonymity,
      encrypted: encryption === "sealed",
      timing,
      audience,
      allowChange,
      lateRoll,
      publishCount,
      lockCancel,
      emailReceipt,
      showVoted,
      disclosure: { name: discName, email: discEmail },
      rules: previewRules,
      closes: closesAt ? closesAt.replace("T", " ") : null,
    }),
  );
  const infoLink = (page: "how" | "methods", anchor: string): string => learnHref(locale, { page, anchor });

  function go(to: number): void {
    problem = null;
    step = Math.max(0, Math.min(last, to));
    void tick().then(() => document.getElementById(`step-${step}`)?.querySelector<HTMLElement>("[data-first]")?.focus());
  }

  /** Whether the step can be left. A step with a missing answer says what is missing and keeps the person on it. */
  function check(at: number): boolean {
    if (at === 1) {
      const empty = languages.filter((l) => titles[l].trim() === "" || questions[l].trim() === "");
      if (empty.length > 0) {
        problem = languages.length === 1 ? m.build.needTitle : fill(m.build.needLanguages, { languages: empty.map(langName).join(", ") });
        editing = empty[0] ?? editing;
        void tick().then(() => document.getElementById(titles[editing].trim() === "" ? `title-${editing}` : `question-${editing}`)?.focus());
        return false;
      }
    }
    if (at === 2 && kind === "choice") {
      const lower = labels.map((l) => l.toLowerCase());
      const untranslated = languages.some((l) => rows.some((r) => r.texts[def].trim() !== "" && r.texts[l].trim() === ""));
      if (untranslated) {
        problem = m.build.needOptionLanguages;
        return false;
      }
      if (labels.length < 2 || new Set(lower).size !== lower.length) {
        problem = labels.length < 2 ? m.build.needOptions : m.errors["options_duplicate"] ?? "";
        return false;
      }
    }
    return true;
  }
  function next(): void {
    if (check(step)) go(step + 1);
  }
  function jump(to: number): void {
    // Going back is always allowed. Going forward passes through every step in between.
    if (to <= step) return go(to);
    for (let at = step; at < to; at++) {
      if (!check(at)) return go(at);
    }
    go(to);
  }

  async function focusOption(key: number): Promise<void> {
    await tick();
    document.getElementById(`option-${key}-${editing}`)?.focus();
  }
  function addAfter(i: number): void {
    if (rows.length >= 12) return;
    const added = row();
    rows.splice(i + 1, 0, added);
    void focusOption(added.key);
  }
  function remove(i: number): void {
    if (rows.length <= 2) return;
    const focusKey = rows[i - 1]?.key ?? rows[i + 1]?.key;
    rows.splice(i, 1);
    if (focusKey !== undefined) void focusOption(focusKey);
  }
  function move(from: number, to: number): void {
    if (to < 0 || to >= rows.length || from === to) return;
    const [item] = rows.splice(from, 1);
    if (!item) return;
    rows.splice(to, 0, item);
    announce = fill(m.build.moved, { n: to + 1 });
    void focusOption(item.key);
  }
  function onOptionKey(event: KeyboardEvent, i: number): void {
    const target = event.currentTarget as HTMLInputElement;
    if (event.key === "Enter") {
      event.preventDefault();
      if (target.value.trim() === "" && i === rows.length - 1) next();
      else addAfter(i);
    } else if (event.key === "Backspace" && target.value === "" && rows.length > 2) {
      event.preventDefault();
      remove(i);
    } else if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      move(i, i - 1);
    } else if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      move(i, i + 1);
    }
  }
  function onTitleKey(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      next();
    }
  }

  const stepLabel = (id: (typeof STEPS)[number]) => m.build.stepNames[id];
</script>

<form class="bld" method="POST" novalidate>
  <div class="bld-main">
    <nav class="bld-steps" aria-label={m.build.stepsLabel}>
      <p class="bld-count" aria-live="polite">{fill(m.build.step, { n: step + 1, total: STEPS.length })}</p>
      <ol>
        {#each STEPS as id, i (id)}
          <li>
            <button type="button" class="bld-step-btn" class:done={i < step} aria-label={stepLabel(id)} aria-current={i === step ? "step" : undefined} onclick={() => jump(i)}>
              <span class="n" aria-hidden="true">{#if i < step}<svg viewBox="0 0 16 16" width="12" height="12"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>{:else}{i + 1}{/if}</span>
              <span class="t">{stepLabel(id)}</span>
            </button>
          </li>
        {/each}
      </ol>
    </nav>

    {#if serverError}<p class="cx-notice error" role="alert">{serverError}</p>{/if}

    <!-- 1. Question -->
    <!-- 1. The kind of poll: a starting point for the settings of step 4 -->
    <section class="bld-step" id="step-0" hidden={enhanced && step !== 0} aria-labelledby="h-0">
      <h2 id="h-0">{stepLabel("template")}</h2>
      <p class="cx-help">{m.form.presetHelp}</p>
      <div class="tpl-grid" role="group" aria-label={m.build.stepNames.template}>
        {#each ["secret", "verifiable", "open"] as const as id, i (id)}
          <button type="button" class="tpl" aria-pressed={matchedPreset === id} data-first={i === 0 ? "" : undefined} onclick={() => applyPreset(id)}>
            <span class="tpl__ico" aria-hidden="true"><UiIcon name={id === "secret" ? "lock" : id === "verifiable" ? "hash" : "users"} size={44} /></span>
            <b class="tpl__title">{m.form.presets.title[id]}</b>
            <small class="tpl__text">{m.form.presets.text[id]}</small>
            <span class="tpl__eg"><b>{m.form.presets.examplesLabel}</b>{#each m.form.presets.examples[id] as example, i (i)}<span>{example}</span>{/each}</span>
            <ul class="tpl__points">{#each m.form.presets.points[id] as point, i (i)}<li>{point}</li>{/each}</ul>
            <span class="tpl__check" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
          </button>
        {/each}
      </div>
      {#if matchedPreset === null}<p class="cx-help" role="status">{m.form.presetCustom}</p>{/if}
    </section>

    <section class="bld-step" id="step-1" hidden={enhanced && step !== 1} aria-labelledby="h-1">
      <h2 id="h-1">{stepLabel("question")}</h2>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.languagesTitle}</legend>
        <p class="cx-help">{m.form.languagesHelp}</p>
        <div class="bld-langs">
          {#each LANGS as lang (lang)}
            <label class="bld-pick"><input type="checkbox" name="languages" value={lang} checked={languages.includes(lang)} onchange={(e) => { const on = (e.currentTarget as HTMLInputElement).checked; languages = on ? [...languages, lang] : languages.filter((l) => l !== lang); }} /><span class="mode">{langName(lang)}</span></label>
          {/each}
        </div>
        {#if languages.length > 1}
          <div class="bld-langs" role="radiogroup" aria-label={m.form.defaultLanguage}>
            {#each languages as lang (lang)}
              <label class="bld-pick"><input type="radio" name="default_language" value={lang} checked={def === lang} onchange={() => { languages = [lang, ...languages.filter((l) => l !== lang)]; }} /><span class="mode">{m.form.defaultLanguage}: {langName(lang)}</span></label>
            {/each}
          </div>
        {/if}
      </fieldset>

      {#if languages.length > 1}
        <div class="bld-tabs" role="group" aria-label={m.form.languagesTitle}>
          {#each languages as lang (lang)}
            <button type="button" class="bld-tab" aria-pressed={editing === lang} onclick={() => (editing = lang)}>{langName(lang)}{#if gaps(lang)}<span class="gap-dot" role="img" aria-label={m.form.missingLanguage}></span>{/if}</button>
          {/each}
        </div>
      {/if}

      <div class="cx-field" class:invalid={problem && step === 1}>
        <label for="title-{editing}">{m.form.pollTitle}</label>
        {#each languages as lang (lang)}
          <input id="title-{lang}" name="title_{lang}" type="text" class="big" lang={lang} maxlength="140" hidden={lang !== editing} data-first={lang === editing ? "" : undefined} bind:value={titles[lang]} autocomplete="off" aria-describedby="title-help{problem && step === 1 ? ' step-problem' : ''}" required />
        {/each}
        <p class="cx-help" id="title-help">{m.form.pollTitleHelp}</p>
      </div>
      <div class="cx-field" class:invalid={problem && step === 1}>
        <label for="question-{editing}">{m.form.question}</label>
        {#each languages as lang (lang)}
          <input id="question-{lang}" name="question_{lang}" type="text" class="big" lang={lang} maxlength="300" hidden={lang !== editing} bind:value={questions[lang]} onkeydown={onTitleKey} autocomplete="off" aria-describedby="question-help" required />
        {/each}
        <p class="cx-help" id="question-help">{m.form.questionHelp}</p>
      </div>
      <div class="cx-field">
        <label for="description-{editing}">{m.form.details} <span class="cx-help">({m.common.optional})</span></label>
        {#each languages as lang (lang)}
          <textarea id="description-{lang}" name="description_{lang}" lang={lang} maxlength="2000" hidden={lang !== editing} aria-describedby="description-help" bind:value={descriptions[lang]}></textarea>
        {/each}
        <p class="cx-help" id="description-help">{m.form.detailsHelp}</p>
      </div>
      {#if problem && step === 1}<p class="cx-error" id="step-problem" role="alert">{problem}</p>{/if}
    </section>

    <!-- 2. Choices -->
    <section class="bld-step" id="step-2" hidden={enhanced && step !== 2} aria-labelledby="h-2">
      <h2 id="h-2">{stepLabel("choices")}</h2>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.kind} <GuideLink {locale} page="methods" anchor={"single"} label={g.methods.title} /></legend>
        <div class="cx-choices cols-2">
          <label class="cx-choice has-ico"><input type="radio" name="kind" value="yes-no" bind:group={kind} data-first /><span><i class="ico"><UiIcon name="check" /></i><b>{m.form.kindYesNo}</b><small>{m.form.kindYesNoText}</small></span></label>
          <label class="cx-choice has-ico"><input type="radio" name="kind" value="choice" bind:group={kind} /><span><i class="ico"><UiIcon name="list" /></i><b>{m.form.kindChoice}</b><small>{m.form.kindChoiceText}</small></span></label>
        </div>
      </fieldset>

      {#if kind === "choice"}
        <fieldset class="cx-field" class:invalid={problem && step === 2}>
          <legend class="cx-label">{m.form.options}</legend>
          <p class="cx-help">{m.form.optionsHelp} <span class="bld-keys">{m.build.optionsKeys}</span></p>
          <ul class="bld-options">
            {#each rows as r, i (r.key)}
              <li class="bld-option" class:dragging={dragFrom === i} draggable={armed === i} ondragstart={(e) => { dragFrom = i; if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); } }} ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); }} ondragend={() => { armed = null; dragFrom = null; }}>
                <div class="bld-row">
                  <button type="button" class="bld-handle" aria-label={fill(m.build.drag, { n: i + 1 })} onpointerdown={() => (armed = i)} onkeydown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); move(i, i - 1); } else if (e.key === "ArrowDown") { e.preventDefault(); move(i, i + 1); } }}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M5.5 3.5h.01M10.5 3.5h.01M5.5 8h.01M10.5 8h.01M5.5 12.5h.01M10.5 12.5h.01" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
                  </button>
                  <button type="button" class="bld-swatch" data-color={r.color || undefined} aria-expanded={r.open} aria-controls="style-{r.key}" aria-label={fill(m.build.styleOpen, { n: i + 1 })} onclick={() => (r.open = !r.open)}>
                    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d={r.icon ? ICONS[r.icon]?.d : ICONS["check"]?.d} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity={r.icon ? 1 : 0.35} /></svg>
                  </button>
                  <label class="sr-only" for="option-{r.key}-{editing}">{fill(m.form.optionN, { n: i + 1 })}</label>
                  {#each languages as lang (lang)}
                    <input id="option-{r.key}-{lang}" name="option_{lang}" type="text" lang={lang} maxlength="120" hidden={lang !== editing} placeholder={fill(m.form.optionN, { n: i + 1 })} bind:value={r.texts[lang]} onkeydown={(e) => onOptionKey(e, i)} autocomplete="off" data-first={i === 0 && lang === editing ? "" : undefined} />
                  {/each}
                  <div class="bld-row-tools">
                    <button type="button" class="bld-tool" aria-label={fill(m.build.moveUp, { n: i + 1 })} disabled={i === 0} onclick={() => move(i, i - 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                    <button type="button" class="bld-tool" aria-label={fill(m.build.moveDown, { n: i + 1 })} disabled={i === rows.length - 1} onclick={() => move(i, i + 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                    <button type="button" class="bld-tool" aria-label={fill(m.build.removeOption, { n: i + 1 })} disabled={rows.length <= 2} onclick={() => remove(i)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg></button>
                  </div>
                </div>
                <input type="hidden" name="option_icon" value={r.icon} />
                <input type="hidden" name="option_color" value={r.color} />
                {#if r.open}
                  <div class="bld-style" id="style-{r.key}" role="group" aria-label={m.build.styleTitle}>
                    <fieldset>
                      <legend>{m.build.iconLabel}</legend>
                      <div class="bld-icons">
                        <label class="bld-pick"><input type="radio" name="icon-{r.key}" value="" bind:group={r.icon} /><span class="none">{m.build.styleDefault}</span></label>
                        {#each ICON_IDS as id (id)}
                          <label class="bld-pick"><input type="radio" name="icon-{r.key}" value={id} bind:group={r.icon} /><span title={iconName(id, locale)}><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d={ICONS[id]?.d} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg><span class="sr-only">{iconName(id, locale)}</span></span></label>
                        {/each}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>{m.build.colorLabel}</legend>
                      <div class="bld-colors">
                        <label class="bld-pick"><input type="radio" name="color-{r.key}" value="" bind:group={r.color} /><span class="none">{m.build.styleDefault}</span></label>
                        {#each COLOR_IDS as id (id)}
                          <label class="bld-pick"><input type="radio" name="color-{r.key}" value={id} bind:group={r.color} /><span class="dot" data-color={id} title={colorName(id, locale)}><span class="sr-only">{colorName(id, locale)}</span></span></label>
                        {/each}
                      </div>
                    </fieldset>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
          <p class="sr-only" aria-live="polite">{announce}</p>
          {#if problem && step === 2}<p class="cx-error" role="alert">{problem}</p>{/if}
          {#if rows.length < 12}<div><button type="button" class="cx-btn ghost small" onclick={() => addAfter(rows.length - 1)}>{m.form.addOption}</button></div>{/if}
        </fieldset>
      {:else}
        <p class="cx-help">{m.build.fixedOptions}</p>
      {/if}

      <fieldset class="cx-field bld-extras">
        <legend class="cx-label">{m.build.moreQuestions}</legend>
        <p class="cx-help">{m.build.moreQuestionsHelp}</p>
        {#each extras as q, qi (q.key)}
          <div class="bld-extra">
            <input type="hidden" name="question_order" value={q.key} />
            <div class="bld-extra-head">
              <h3>{fill(m.build.questionN, { n: qi + 2 })}</h3>
              <div class="bld-row-tools">
                <button type="button" class="bld-tool" aria-label={fill(m.build.moveQuestionUp, { n: qi + 2 })} disabled={qi === 0} onclick={() => moveQuestion(qi, qi - 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                <button type="button" class="bld-tool" aria-label={fill(m.build.moveQuestionDown, { n: qi + 2 })} disabled={qi === extras.length - 1} onclick={() => moveQuestion(qi, qi + 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                <button type="button" class="bld-tool" aria-label={fill(m.build.removeQuestion, { n: qi + 2 })} onclick={() => removeQuestion(qi)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg></button>
              </div>
            </div>
            <div class="cx-choices cols-2" role="radiogroup" aria-label={m.form.kind}>
              <label class="cx-choice"><input type="radio" name="q{q.key}_kind" value="yes-no" bind:group={q.kind} /><span><b>{m.form.kindYesNo}</b></span></label>
              <label class="cx-choice"><input type="radio" name="q{q.key}_kind" value="choice" bind:group={q.kind} /><span><b>{m.form.kindChoice}</b></span></label>
            </div>
            <div class="cx-field">
              <label for="q{q.key}-question-{editing}">{m.form.question}</label>
              {#each languages as lang (lang)}
                <input id="q{q.key}-question-{lang}" name="q{q.key}_question_{lang}" type="text" lang={lang} maxlength="300" hidden={lang !== editing} bind:value={q.texts[lang]} autocomplete="off" />
              {/each}
            </div>
            {#if q.kind === "choice"}
              <ul class="bld-options">
                {#each q.rows as r, j (r.key)}
                  <li class="bld-option">
                    <div class="bld-row">
                      <label class="sr-only" for="q{q.key}-option-{r.key}-{editing}">{fill(m.form.optionN, { n: j + 1 })}</label>
                      {#each languages as lang (lang)}
                        <input id="q{q.key}-option-{r.key}-{lang}" name="q{q.key}_option_{lang}" type="text" lang={lang} maxlength="120" hidden={lang !== editing} placeholder={fill(m.form.optionN, { n: j + 1 })} bind:value={r.texts[lang]} autocomplete="off" />
                      {/each}
                      <div class="bld-row-tools">
                        <button type="button" class="bld-tool" aria-label={fill(m.build.removeOption, { n: j + 1 })} disabled={q.rows.length <= 2} onclick={() => q.rows.splice(j, 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg></button>
                      </div>
                    </div>
                    <input type="hidden" name="q{q.key}_option_icon" value="" />
                    <input type="hidden" name="q{q.key}_option_color" value="" />
                  </li>
                {/each}
              </ul>
              {#if q.rows.length < 12}<div><button type="button" class="cx-btn ghost small" onclick={() => q.rows.push(newExtraRow())}>{m.form.addOption}</button></div>{/if}
            {:else}
              <p class="cx-help">{m.build.fixedOptions}</p>
            {/if}
          </div>
        {/each}
        {#if extras.length < 19}<div><button type="button" class="cx-btn ghost small" onclick={addQuestion}>{m.build.addQuestion}</button></div>{/if}
      </fieldset>

      <fieldset class="cx-field">
        <legend class="cx-label">{m.build.fillLabel}</legend>
        <p class="cx-help">{m.build.fillHelp}</p>
        <div class="bld-fill">
          <label class="bld-pick"><input type="radio" name="marks" value="outline" bind:group={markFillValue} /><span class="mode"><span class="mk-sample" data-color="green" aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16"><path d={ICONS["check"]?.d} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg></span>{m.build.fillOutline}</span></label>
          <label class="bld-pick"><input type="radio" name="marks" value="fill" bind:group={markFillValue} /><span class="mode"><span class="mk-sample" data-color="green" data-fill aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16"><path d={ICONS["check"]?.d} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg></span>{m.build.fillSolid}</span></label>
        </div>
      </fieldset>
    </section>

    <!-- 3. Results -->
    <section class="bld-step" id="step-3" hidden={enhanced && step !== 3} aria-labelledby="h-3">
      <h2 id="h-3">{stepLabel("results")}</h2>
      <p class="cx-help">{m.form.resultsHelp}</p>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.timing}</legend>
        <div class="cx-choices cols-2">
          {#each TIMINGS as value, i (value)}
            <label class="cx-choice has-ico"><input type="radio" name="timing" {value} bind:group={timing} data-first={i === 0 ? "" : undefined} /><span><i class="ico"><UiIcon name={value === "close" ? "lock" : "pulse"} /></i><b>{m.form.timingNames.title[value]}</b><small>{m.form.timingNames.text[value]}</small></span></label>
          {/each}
        </div>
      </fieldset>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.audience}</legend>
        <div class="cx-choices cols-4">
          {#each AUDIENCES as value (value)}
            <label class="cx-choice has-ico"><input type="radio" name="audience" {value} bind:group={audience} /><span><i class="ico"><UiIcon name={value === "owner" ? "key" : value === "administrators" ? "shield" : value === "voters" ? "users" : "globe"} /></i><b>{m.form.audienceNames.title[value]}</b><small>{m.form.audienceNames.text[value]}</small></span></label>
          {/each}
        </div>
      </fieldset>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.anonymityTitle} <GuideLink {locale} page="how" anchor={privacy === "named" ? "named" : "secret"} label={g.props.learn} /></legend>
        <div class="cx-choices cols-3">
          {#each ["anonymous", "voters", "named"] as const as value (value)}
            <label class="cx-choice has-ico"><input type="radio" name="privacy" {value} checked={privacy === value} onchange={() => setPrivacy(value)} /><span><i class="ico"><UiIcon name={value === "anonymous" ? "mask" : value === "voters" ? "ballot" : "users"} /></i><b>{m.form.anonymityNames.title[value]}</b><small>{m.form.anonymityNames.text[value]}</small></span></label>
          {/each}
        </div>
        <input type="hidden" name="anonymity" value={anonymity} />
        <input type="hidden" name="show_voted" value={showVoted ? "yes" : "no"} />
      </fieldset>
      {#if anonymity === "named"}
        <fieldset class="cx-field disclosure">
          <legend class="cx-label">{g.disclosure.title} <GuideLink {locale} page="how" anchor={"list"} label={g.props.learn} /></legend>
          <p class="cx-help">{g.disclosure.help}</p>
          <div class="disc-grid">
            <div role="radiogroup" aria-label={g.disclosure.nameTitle}>
              <p class="cx-sublabel">{g.disclosure.nameTitle}</p>
              {#each NAME_MODES as value (value)}
                <label class="cx-choice"><input type="radio" name="disclosure_name" {value} bind:group={discName} /><span><b>{g.disclosure.nameModes[value].title}</b>{#if g.disclosure.nameModes[value].example}<small class="sample">{value === "masked" ? maskName(sampleName) : sampleName}</small>{/if}</span></label>
              {/each}
            </div>
            <div role="radiogroup" aria-label={g.disclosure.emailTitle}>
              <p class="cx-sublabel">{g.disclosure.emailTitle}</p>
              {#each EMAIL_MODES as value (value)}
                <label class="cx-choice"><input type="radio" name="disclosure_email" {value} bind:group={discEmail} /><span><b>{g.disclosure.emailModes[value].title}</b>{#if g.disclosure.emailModes[value].example}<small class="sample">{value === "masked" ? maskEmail(sampleAddress) : sampleAddress}</small>{/if}</span></label>
              {/each}
            </div>
          </div>
          <p class="cx-help">{g.disclosure.adminsFull} {g.disclosure.needsNames}</p>
          {#if discName === "none" && discEmail === "none"}<p class="cx-help" role="status">{g.disclosure.nobody}</p>{/if}
          {#if audience === "anyone" && discEmail === "full"}<p class="cx-help warn" role="status">{g.disclosure.publicFull}</p>{/if}
        </fieldset>
      {/if}
      <fieldset class="cx-field">
        <legend class="cx-label">{m.seal.title} <GuideLink {locale} page="how" anchor={"sealed"} label={g.props.learn} /></legend>
        <p class="cx-help">{m.seal.help}</p>
        <div class="cx-choices cols-2">
          <label class="cx-choice has-ico"><input type="radio" name="encryption" value="sealed" bind:group={encryption} disabled={timing === "live"} /><span><i class="ico"><UiIcon name="lock" /></i><b>{m.seal.sealed.title}</b><small>{m.seal.sealed.text}</small></span></label>
          <label class="cx-choice has-ico"><input type="radio" name="encryption" value="none" bind:group={encryption} /><span><i class="ico"><UiIcon name="unlock" /></i><b>{m.seal.none.title}</b><small>{m.seal.none.text}</small></span></label>
        </div>
        {#if timing === "live"}<p class="cx-help" role="status">{m.seal.liveNote}</p>{/if}
        {#if encryption === "sealed"}<div class="cx-notice warn gap" role="note"><div><p><b>{m.seal.riskTitle}.</b> {m.seal.riskText}</p><p><GuideLink {locale} page="how" anchor="counting-key" label={g.props.learn} /></p></div></div>{/if}
      </fieldset>
      {#if encryption === "sealed"}
        <fieldset class="cx-field">
          <legend class="cx-label">{m.form.keyModeTitle}</legend>
          <div class="cx-choices cols-2">
            <label class="cx-choice has-ico"><input type="radio" name="key_mode" value="one" bind:group={keyMode} /><span><i class="ico"><UiIcon name="key" /></i><b>{m.form.keyOne}</b><small>{m.form.keyOneText}</small></span></label>
            <label class="cx-choice has-ico"><input type="radio" name="key_mode" value="shared" bind:group={keyMode} disabled={administrators < 2} /><span><i class="ico"><UiIcon name="users" /></i><b>{m.form.keyShared}</b><small>{m.form.keySharedText}</small></span></label>
          </div>
          {#if administrators < 2}<p class="cx-help" role="status">{m.form.keyNeedsAdmins}</p>{/if}
          {#if keyMode === "shared"}
            <div class="bld-rule"><label for="key_threshold">{m.form.keyThresholdLabel}</label><input id="key_threshold" name="key_threshold" type="number" min="2" max={Math.max(2, administrators)} step="1" inputmode="numeric" bind:value={keyThreshold} /><span class="unit">/ {administrators}</span></div>
          {/if}
        </fieldset>
      {/if}
      <fieldset class="cx-field">
        <label class="cx-choice check has-ico"><input type="checkbox" name="publish_count" value="yes" bind:checked={publishCount} /><span><i class="ico"><UiIcon name="eye" /></i><b>{m.form.publishLabel}</b><small>{m.form.publishHelp}</small></span></label>
        <label class="cx-choice check has-ico"><input type="checkbox" name="email_receipt" value="yes" bind:checked={emailReceipt} onchange={() => (emailReceiptSet = true)} /><span><i class="ico"><UiIcon name="mail" /></i><b>{m.form.emailReceiptLabel}</b><small>{anonymity === "secret" ? m.form.emailReceiptHelpSecret : m.form.emailReceiptHelp}</small></span></label>
        <label class="cx-choice check has-ico"><input type="checkbox" name="lock_cancel" value="yes" bind:checked={lockCancel} /><span><i class="ico"><UiIcon name="lock" /></i><b>{m.form.lockCancelLabel}</b><small>{m.form.lockCancelHelp}</small></span></label>
      </fieldset>
    </section>

    <!-- 4. Dates and look -->
    <section class="bld-step" id="step-4" hidden={enhanced && step !== 4} aria-labelledby="h-4">
      <h2 id="h-4">{stepLabel("closing")}</h2>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.opening}</legend>
        <div class="cx-choices cols-2">
          <label class="cx-choice has-ico"><input type="radio" name="opens_mode" value="manual" bind:group={opensMode} data-first /><span><i class="ico"><UiIcon name="flag" /></i><b>{m.form.openManual}</b></span></label>
          <label class="cx-choice has-ico"><input type="radio" name="opens_mode" value="date" bind:group={opensMode} /><span><i class="ico"><UiIcon name="clock" /></i><b>{m.form.openDate}</b></span></label>
        </div>
        {#if opensMode === "date"}
          <div class="cx-field">
            <label for="opens_at">{m.form.openAt}</label>
            <input id="opens_at" name="opens_at" type="datetime-local" bind:value={opensAt} />
          </div>
        {/if}
      </fieldset>

      <div class="cx-field">
        <label for="closes_at">{m.form.closeAt}</label>
        <input id="closes_at" name="closes_at" type="datetime-local" bind:value={closesAt} required aria-describedby="closes-help" />
        <p class="cx-help" id="closes-help">{fill(m.form.closeHelp, { tz: zone })}</p>
      </div>

      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.rulesTitle}</legend>
        <p class="cx-help">{m.form.rulesHelp}</p>
        <div class="bld-rule">
          <label class="cx-choice check"><input type="checkbox" name="rule_votes" value="yes" bind:checked={ruleVotes} /><span><b>{m.form.ruleVotes}</b></span></label>
          {#if ruleVotes}<label class="sr-only" for="rule_votes_n">{m.form.ruleVotes}</label><input id="rule_votes_n" name="rule_votes_n" type="number" min="1" step="1" inputmode="numeric" bind:value={ruleVotesN} /><span class="unit">{m.form.members}</span>{/if}
        </div>
        <div class="bld-rule">
          <label class="cx-choice check"><input type="checkbox" name="rule_turnout" value="yes" bind:checked={ruleTurnout} /><span><b>{m.form.ruleTurnout}</b></span></label>
          {#if ruleTurnout}<label class="sr-only" for="rule_turnout_p">{m.form.ruleTurnout}</label><input id="rule_turnout_p" name="rule_turnout_p" type="number" min="1" max="100" step="1" inputmode="numeric" bind:value={ruleTurnoutP} /><span class="unit">{m.form.percent}</span>{/if}
        </div>
        <div class="cx-choices cols-3">
          <label class="cx-choice"><input type="radio" name="rule_threshold" value="none" bind:group={ruleThreshold} /><span><b>{m.form.ruleThresholdNone}</b></span></label>
          <label class="cx-choice"><input type="radio" name="rule_threshold" value="majority" bind:group={ruleThreshold} disabled={encryption === "sealed" || extras.length > 0} /><span><b>{m.form.ruleThresholdMajority}</b></span></label>
          <label class="cx-choice"><input type="radio" name="rule_threshold" value="percent" bind:group={ruleThreshold} disabled={encryption === "sealed" || extras.length > 0} /><span><b>{m.form.ruleThresholdPercent}</b></span></label>
        </div>
        {#if ruleThreshold === "percent"}
          <div class="bld-rule"><label class="sr-only" for="rule_threshold_p">{m.form.ruleThresholdPercent}</label><input id="rule_threshold_p" name="rule_threshold_p" type="number" min="1" max="100" step="1" inputmode="numeric" bind:value={ruleThresholdP} /><span class="unit">{m.form.percent}</span></div>
        {/if}
        {#if encryption === "sealed"}<p class="cx-help" role="status">{m.form.ruleNeedsReadable}</p>{/if}
        {#if extras.length > 0}<p class="cx-help" role="status">{m.build.thresholdOneQuestion}</p>{/if}
      </fieldset>

      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.changeTitle}</legend>
        <label class="cx-choice check has-ico"><input type="checkbox" name="allow_change" value="yes" bind:checked={allowChange} disabled={encryption !== "sealed"} /><span><i class="ico"><UiIcon name="check" /></i><b>{m.form.changeLabel}</b><small>{m.form.changeHelp}</small></span></label>
        {#if encryption !== "sealed"}<p class="cx-help" role="status">{m.form.changeNeedsSealed}</p>{/if}
      </fieldset>

      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.reminderTitle}</legend>
        <p class="cx-help">{m.form.reminderHelp}</p>
        <div class="cx-choices cols-3">
          {#each [["none", m.form.reminderNone], ["daily", m.form.reminderDaily], ["before_close", m.form.reminderBefore]] as const as [value, label] (value)}
            <label class="cx-choice has-ico"><input type="radio" name="auto_reminder" {value} bind:group={autoReminder} disabled={privacy === "anonymous" && value !== "none"} /><span><i class="ico"><UiIcon name="clock" /></i><b>{label}</b></span></label>
          {/each}
        </div>
        {#if privacy === "anonymous"}<p class="cx-help" role="status">{m.form.reminderHidden}</p>{/if}
        {#if autoReminder !== "none"}
          <label class="cx-choice check"><input type="checkbox" name="reminder_permission" value="yes" bind:checked={reminderPermission} /><span><b>{m.mail.attest}</b></span></label>
        {/if}
      </fieldset>

      <fieldset class="cx-field">
        <label class="cx-choice check has-ico"><input type="checkbox" name="late_roll" value="yes" bind:checked={lateRoll} /><span><i class="ico"><UiIcon name="users" /></i><b>{m.form.lateRollLabel}</b><small>{m.form.lateRollHelp}</small></span></label>
      </fieldset>

      <fieldset class="cx-field">
        <label class="cx-choice check has-ico"><input type="checkbox" name="paged" value="yes" bind:checked={paged} /><span><i class="ico"><UiIcon name="list" /></i><b>{m.form.pagedLabel}</b><small>{m.form.pagedHelp}</small></span></label>
      </fieldset>

      <fieldset class="cx-field">
        <legend class="cx-label">{m.build.lookTitle}</legend>
        <div class="cx-choices cols-3">
          {#each THEMES as value (value)}
            <label class="cx-choice has-ico"><input type="radio" name="theme" {value} bind:group={theme} /><span><i class="ico"><UiIcon name="layout" /></i><b>{THEME_NAMES[value][locale]}</b></span></label>
          {/each}
        </div>
      </fieldset>
    </section>

    <!-- 5. Review -->
    <section class="bld-step" id="step-5" hidden={enhanced && step !== 5} aria-labelledby="h-5">
      <h2 id="h-5">{stepLabel("review")}</h2>
      <p class="cx-help">{m.build.reviewLead}</p>
      <dl class="bld-review">
        <div><dt>{m.form.pollTitle}</dt><dd>{titles[def] || "–"}<br />{questions[def] || "–"}</dd><dd><button type="button" class="cx-link" onclick={() => go(0)}>{m.build.change}</button></dd></div>
        <div><dt>{m.form.options}</dt><dd>{kind === "choice" ? labels.join(" · ") || "–" : m.form.kindYesNo}</dd><dd><button type="button" class="cx-link" onclick={() => go(1)}>{m.build.change}</button></dd></div>
        {#if extras.length > 0}<div><dt>{m.build.moreQuestions}</dt><dd>{fill(m.build.moreCount, { n: extras.length })}</dd><dd><button type="button" class="cx-link" onclick={() => go(1)}>{m.build.change}</button></dd></div>{/if}
      </dl>
      <h3 class="bld-subhead">{m.build.settingsTitle}</h3>
      <PropertyList {locale} items={properties} />
      <p class="bld-changes"><button type="button" class="cx-link" onclick={() => go(2)}>{m.build.change}: {m.build.stepNames.results}</button><button type="button" class="cx-link" onclick={() => go(3)}>{m.build.change}: {m.build.stepNames.closing}</button></p>
    </section>

    <div class="bld-nav">
      {#if enhanced && step > 0}<button type="button" class="cx-btn ghost" onclick={() => go(step - 1)}>{m.build.back}</button>{/if}
      {#if enhanced && step < last}
        <button type="button" class="cx-btn" onclick={next}>{m.build.next}</button>
      {:else}
        <button class="cx-btn" type="submit">{submit}</button>
      {/if}
    </div>
  </div>

  <aside class="bld-preview" aria-labelledby="preview-h">
    <h2 id="preview-h">{m.build.previewTitle}</h2>
    <p class="cx-help">{m.build.previewNote}</p>
    <div class="bld-phone">
      <!-- The surface scrolls. A choice can be made in the preview to see how a chosen option looks, but it belongs to no form, so nothing is sent or recorded. -->
      <div class="preview-surface" data-theme={theme}>
        <div class="voter" lang={editing}><div class="ballot"><BallotView locale={editing} poll={preview} preview /></div></div>
      </div>
    </div>
  </aside>
</form>
