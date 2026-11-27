<script lang="ts">
  import { consoleMessages, errorText, fill, rulesSentence } from "#lib/i18n/console.js";
  import type { CloseRules } from "#lib/close-rules.js";
  import PropertyList from "#lib/components/PropertyList.svelte";
  import type { Disclosure } from "#lib/disclosure.js";
  import { guideMessages } from "#lib/i18n/guide.js";
  import { propertiesOf, typeOfOptions } from "#lib/properties.js";
  import { DEFAULT_TIME_ZONE, formatMoment } from "#lib/zoned.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { iconOf, iconPath } from "#lib/option-style.js";
  import { optionLabel } from "#lib/option-labels.js";
  import type { ResultsAudience, ResultsTiming } from "#lib/results-rules.js";

  interface BallotOption {
    readonly id: string;
    readonly label: string | null;
    readonly icon?: string | null;
    readonly color?: string | null;
  }
  interface BallotQuestion {
    readonly id: string;
    readonly prompt: string;
    readonly options: readonly BallotOption[];
  }
  interface BallotPoll {
    readonly title: string;
    readonly question: string;
    readonly description: string;
    readonly options: readonly BallotOption[];
    /** Every question as the member reads it. Absent in the builder preview, which shows the first question only. */
    readonly questions?: readonly BallotQuestion[];
    readonly timing: ResultsTiming;
    readonly audience: ResultsAudience;
    readonly encrypted: boolean;
    readonly markFill: boolean;
    readonly anonymity: "secret" | "named";
    readonly allowChange: boolean;
    readonly lateRoll: boolean;
    /** What the poll tells about its list of answers, its published count and cancelling. Absent for a poll that says nothing of them. */
    readonly publishCount?: boolean;
    readonly lockCancel?: boolean;
    readonly emailReceipt?: boolean;
    readonly disclosure?: Disclosure | null;
    /** How the poll was approved when published. Absent in the builder preview and for older polls. */
    readonly approval?: { readonly rule: "none" | "majority" | "all"; readonly approvals: number; readonly eligible: number; readonly at: string; readonly digest: string; readonly confirmed?: number | undefined } | null;
    readonly rules: CloseRules;
    readonly timeZone?: string;
    readonly closesAt: string | null;
    readonly rollCount: number | null;
    readonly rollCode: string | null;
  }

  /**
   * The ballot a member sees, in the template of the surrounding page. It is the same markup for a real ballot and for
   * the preview in the poll builder, so that what an administrator sees is what a member gets. In a preview the
   * choices are shown but cannot be used.
   */
  let {
    locale,
    poll,
    failure = null,
    preview = false,
    step = "all",
    qid = "q1",
    answers = $bindable<Record<string, string>>({}),
    failureQuestion = null,
    onedit = () => {},
    agreed = $bindable(false),
    organization = "",
    calendarHref = "",
    stepNo = 1,
    stepTotal = 1,
    onnext = () => {},
    onback = () => {},
  }: {
    locale: Locale;
    poll: BallotPoll;
    failure?: string | null;
    preview?: boolean;
    /** "all" shows everything on one page; the other values show one page of the paged flow. */
    step?: "all" | "intro" | "rules" | "question" | "summary" | "confirm";
    /** The question shown on a "question" page. */
    qid?: string;
    answers?: Record<string, string>;
    /** The question a server error is about, when it is about one. */
    failureQuestion?: string | null;
    onedit?: (id: string) => void;
    agreed?: boolean;
    organization?: string;
    calendarHref?: string;
    stepNo?: number;
    stepTotal?: number;
    onnext?: () => void;
    onback?: () => void;
  } = $props();

  const m = $derived(consoleMessages[locale]);
  const when = (iso: string) => formatMoment(iso, locale, poll.timeZone ?? DEFAULT_TIME_ZONE);
  const check = "M3.5 8.5l3 3 6-7";
  const paged = $derived(step !== "all");
  const approvalText = $derived.by(() => {
    const a = poll.approval;
    if (!a) return "";
    if (a.rule === "none") return a.eligible <= 1 ? m.approval.factOnlyOne : m.approval.factNoRule;
    if (a.eligible < 2) return m.approval.factSingle;
    return fill(m.approval.factApproved, { a: a.approvals, n: a.eligible, date: when(a.at), rule: m.approval.rules[a.rule] });
  });
  const approvalCode = $derived(poll.approval ? poll.approval.digest.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, "$1-") : "");
  const questions = $derived<readonly BallotQuestion[]>(poll.questions && poll.questions.length > 0 ? poll.questions : [{ id: "q1", prompt: poll.question, options: poll.options }]);
  const many = $derived(questions.length > 1);
  const current = $derived(questions.find((q) => q.id === qid) ?? questions[0]);
  const currentIndex = $derived(Math.max(0, questions.findIndex((q) => q.id === qid)));
  const labelOf = (q: BallotQuestion): string => {
    const index = q.options.findIndex((o) => o.id === answers[q.id]);
    const option = q.options[index];
    return option ? optionLabel(locale, option) || fill(m.form.optionN, { n: index + 1 }) : "";
  };
  const properties = $derived(
    propertiesOf(locale, {
      questionTypes: questions.map((q) => typeOfOptions(q.options)),
      anonymity: poll.anonymity,
      encrypted: poll.encrypted,
      timing: poll.timing,
      audience: poll.audience,
      allowChange: poll.allowChange,
      lateRoll: poll.lateRoll,
      publishCount: poll.publishCount ?? false,
      lockCancel: poll.lockCancel ?? false,
      emailReceipt: poll.emailReceipt ?? false,
      disclosure: poll.disclosure ?? null,
      rules: poll.rules,
      closes: poll.closesAt ? when(poll.closesAt) : null,
      roll: { count: poll.rollCount, code: poll.rollCode },
      ...(poll.approval
        ? { approval: { badge: poll.approval.rule !== "none" && poll.approval.eligible >= 2 ? fill(guideMessages[locale].props.approvalBadge, { a: poll.approval.approvals, n: poll.approval.eligible }) : guideMessages[locale].props.approvalNone, lines: [approvalText, fill(m.approval.factCode, { code: approvalCode }), poll.approval.confirmed !== undefined ? fill(m.approval.factConfirmed, { c: poll.approval.confirmed, n: poll.approval.eligible }) : ""].filter((t) => t !== "") } }
        : {}),
    }),
  );
  const answered = (id: string) => (answers[id] ?? "") !== "";
  /**
   * The last page of a flow is where the ballot is sent: the check page when the vote is final. When it can be changed,
   * the page after the last question: the summary for several questions, the question itself for one.
   */
  const sendsHere = $derived(step === "confirm" || (poll.allowChange && ((many && step === "summary") || (!many && step === "question"))));
  const blocked = $derived((step === "rules" && !agreed) || (step === "question" && !answered(qid)));
</script>

  {#if paged}
    <p class="stepno" aria-label={fill(m.voter.stepOf, { n: stepNo, total: stepTotal })}>
      <span class="dots" aria-hidden="true">{#each Array.from({ length: stepTotal }, (_, i) => i + 1) as n (n)}<i class:on={n <= stepNo}></i>{/each}</span>
      <span>{fill(m.voter.stepOf, { n: stepNo, total: stepTotal })}</span>
    </p>
  {/if}

<div class="slip" data-step={step}>
  {#if step === "all" || step === "intro"}
    <div class="ballot__head">
      {#if step === "intro" && organization}<p class="org-name">{organization}</p>{/if}
      <h1 id="q-title" tabindex="-1">{poll.title || m.voter.untitled}</h1>
      {#if step === "all" && poll.question}<p class="question" id="q-text">{poll.question}</p>{/if}
      {#if poll.description}<p class="lede">{poll.description}</p>{:else if step === "intro" || !poll.question}<p class="lede">{m.voter.lede}</p>{/if}
      {#if step === "intro" && poll.closesAt}<p class="when-line">{fill(m.voter.introClose, { date: when(poll.closesAt) })}</p>{/if}
    </div>
  {:else if step === "rules"}
    <div class="ballot__head"><h1 id="q-title" tabindex="-1">{m.voter.rulesTitle}</h1></div>
  {:else if step === "question"}
    <div class="ballot__head">
      <p class="eyebrow">{poll.title}{#if many}{" · "}{fill(m.voter.questionOf, { n: currentIndex + 1, total: questions.length })}{/if}</p>
      <h1 id="q-title" tabindex="-1">{current?.prompt || poll.title}</h1>
    </div>
  {:else if step === "summary"}
    <div class="ballot__head"><h1 id="q-title" tabindex="-1">{m.voter.summaryTitle}</h1></div>
  {:else}
    <div class="ballot__head"><h1 id="q-title" tabindex="-1">{m.voter.confirmTitle}</h1></div>
  {/if}

  {#if step === "all" || step === "rules"}
    <section aria-label={m.voter.facts}><PropertyList {locale} items={properties} links={!preview} /></section>
  {/if}

  {#if step === "rules" && poll.closesAt && calendarHref}<p class="cal"><a href={calendarHref} data-sveltekit-reload>{m.voter.addToCalendar}</a></p>{/if}

  {#if step === "summary" || step === "confirm"}
    <dl class="facts" aria-label={m.voter.confirmChoice}>
      {#each questions as q (q.id)}
        <div>
          <dt>{q.prompt || poll.title}</dt>
          <dd class="picked">{labelOf(q)}</dd>
          {#if step === "summary"}<dd class="change"><button class="linklike" type="button" onclick={() => onedit(q.id)}>{m.voter.changeAnswer}<span class="sr-only"> · {q.prompt || poll.title}</span></button></dd>{/if}
        </div>
      {/each}
    </dl>
  {/if}
  {#if step === "confirm"}<p class="notice-final" role="note">{m.voter.confirmFinal}</p>{/if}

  {#each questions as q, qi (q.id)}
    <div hidden={paged && !(step === "question" && qid === q.id)}>
      {#if !paged && qi > 0}<p class="question">{q.prompt}</p>{/if}
      <fieldset class="choices" data-fill={poll.markFill ? "" : undefined} aria-describedby={failure && (failureQuestion === null || failureQuestion === q.id) ? "choice-error" : undefined}>
        <legend class="sr-only">{q.prompt || m.voter.legend}</legend>
        {#each q.options as option, i (option.id)}
          {@const icon = iconOf(option)}
          <div class="choice" data-color={option.color ?? undefined} data-icon={option.icon ? option.icon : undefined}>
            <input type="radio" name="a_{q.id}" id="a_{q.id}_{option.id}" value={option.id} bind:group={answers[q.id]} disabled={preview} />
            <label for="a_{q.id}_{option.id}">
              <span class="mark" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d={iconPath(icon) ?? check} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
              </span>
              <span>{optionLabel(locale, option) || `${m.form.optionN.replace("{n}", String(i + 1))}`}</span>
            </label>
          </div>
        {/each}
      </fieldset>
    </div>
  {/each}

  {#if failure}<p class="error" id="choice-error" role="alert">{m.voter.problem} {errorText(m, failure)}</p>{/if}
</div>

<div class="castbar" class:steps={paged}>
  {#if step === "rules"}
    <label class="agree"><input type="checkbox" bind:checked={agreed} /><span>{m.voter.agree}</span></label>
  {/if}
  {#if !paged}
    <button class="cast" type={preview ? "button" : "submit"} disabled={preview}>{m.voter.submit}</button>
  {:else if step === "intro"}
    <a class="cast" href="?view=all" onclick={(e) => { e.preventDefault(); onnext(); }}>{m.voter.start}</a>
  {:else}
    <div class="castbar__row">
    <button class="back" type="button" onclick={onback}>{m.voter.back}</button>
    {#if sendsHere}
      <button class="cast" type="submit" disabled={blocked}>{step === "confirm" ? m.voter.confirmSubmit : m.voter.submit}</button>
    {:else}
      <button class="cast" type="button" onclick={onnext} disabled={blocked}>{m.voter.next}</button>
    {/if}
    </div>
  {/if}
</div>
