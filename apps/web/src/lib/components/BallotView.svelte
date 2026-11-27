<script lang="ts">
  import { consoleMessages, errorText, fill, rulesSentence } from "#lib/i18n/console.js";
  import type { CloseRules } from "#lib/close-rules.js";
  import UiIcon from "#lib/components/UiIcon.svelte";
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
  interface BallotPoll {
    readonly title: string;
    readonly question: string;
    readonly description: string;
    readonly options: readonly BallotOption[];
    readonly timing: ResultsTiming;
    readonly audience: ResultsAudience;
    readonly encrypted: boolean;
    readonly markFill: boolean;
    readonly anonymity: "secret" | "named";
    readonly allowChange: boolean;
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
    chosen = $bindable(""),
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
    step?: "all" | "intro" | "rules" | "question" | "confirm";
    chosen?: string;
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
  const chosenLabel = $derived.by(() => {
    const index = poll.options.findIndex((o) => o.id === chosen);
    const option = poll.options[index];
    return option ? optionLabel(locale, option) || fill(m.form.optionN, { n: index + 1 }) : "";
  });
  /** The last page of a flow is where the ballot is sent: the check page when the vote is final, else the question. */
  const sendsHere = $derived(step === "confirm" || (step === "question" && poll.allowChange));
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
      <h1 id="q-title" tabindex="-1">{poll.title || "…"}</h1>
      {#if step === "all" && poll.question}<p class="question" id="q-text">{poll.question}</p>{/if}
      {#if poll.description}<p class="lede">{poll.description}</p>{:else if step === "intro" || !poll.question}<p class="lede">{m.voter.lede}</p>{/if}
      {#if step === "intro" && poll.closesAt}<p class="when-line">{fill(m.voter.introClose, { date: when(poll.closesAt) })}</p>{/if}
    </div>
  {:else if step === "rules"}
    <div class="ballot__head"><h1 id="q-title" tabindex="-1">{m.voter.rulesTitle}</h1></div>
  {:else if step === "question"}
    <div class="ballot__head">
      <p class="eyebrow">{poll.title}</p>
      <h1 id="q-title" tabindex="-1">{poll.question || poll.title}</h1>
    </div>
  {:else}
    <div class="ballot__head"><h1 id="q-title" tabindex="-1">{m.voter.confirmTitle}</h1></div>
  {/if}

  {#if step === "all" || step === "rules"}
  <dl class="facts" aria-label={m.voter.facts}>
    <div>
      <dt>{m.voter.closes}</dt>
      <dd>{poll.closesAt ? when(poll.closesAt) : m.voter.noClose}</dd>
      {#if rulesSentence(m, poll.rules)}<dd class="note">{rulesSentence(m, poll.rules)}</dd>{/if}
    </div>
    <div>
      <dt>{m.voter.roll}</dt>
      <dd>{poll.rollCount === null ? "—" : poll.rollCount === 1 ? m.voter.rollOne : fill(m.voter.rollValue, { n: poll.rollCount })}</dd>
      {#if poll.rollCode}<dd class="note">{fill(m.voter.rollNote, { code: poll.rollCode })}</dd>{/if}
    </div>
    <div>
      <dt>{m.voter.ballotType}</dt>
      <dd class="badges">
        <span class="badge"><UiIcon name={poll.anonymity === "named" ? "users" : "shield"} size={16} />{poll.anonymity === "named" ? m.voter.namedValue : m.voter.ballotValue}</span>
        <span class="badge"><UiIcon name={poll.encrypted ? "lock" : "eye"} size={16} />{poll.encrypted ? m.seal.factSealed : m.seal.factPlain}</span>
      </dd>
      <dd class="note">{poll.anonymity === "named" ? fill(m.voter.namedNote, { who: m.voter.namedWho[poll.audience] }) : m.voter.ballotNote} {poll.encrypted ? m.seal.ballotSealed : m.seal.ballotPlain}</dd>
    </div>
    <div>
      <dt>{m.voter.yourVote}</dt>
      <dd class="note">{poll.allowChange ? m.voter.changeAllowed : m.voter.changeFinal}</dd>
    </div>
    <div>
      <dt>{m.voter.results}</dt>
      <dd class="note">{m.resultsStatement[poll.timing][poll.audience]}</dd>
    </div>
  </dl>
  {/if}

  {#if step === "rules" && poll.closesAt && calendarHref}<p class="cal"><a href={calendarHref} data-sveltekit-reload>{m.voter.addToCalendar}</a></p>{/if}

  {#if step === "confirm"}
    <dl class="facts"><div><dt>{m.voter.confirmChoice}</dt><dd class="picked">{chosenLabel}</dd></div></dl>
    <p class="notice-final" role="note">{m.voter.confirmFinal}</p>
  {/if}

  <div hidden={paged && step !== "question"}>
  <fieldset class="choices" data-fill={poll.markFill ? "" : undefined} aria-describedby={failure ? "choice-error" : undefined}>
    <legend class="sr-only">{poll.question || m.voter.legend}</legend>
    {#each poll.options as option, i (option.id)}
      {@const icon = iconOf(option)}
      <div class="choice" data-color={option.color ?? undefined} data-icon={option.icon ? option.icon : undefined}>
        <input type="radio" name="choice" id="c-{option.id}" value={option.id} bind:group={chosen} disabled={preview} />
        <label for="c-{option.id}">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d={iconPath(icon) ?? check} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          <span>{optionLabel(locale, option) || `${m.form.optionN.replace("{n}", String(i + 1))}`}</span>
        </label>
      </div>
    {/each}
  </fieldset>
  </div>

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
      <button class="cast" type="submit" disabled={step === "question" && chosen === ""}>{step === "confirm" ? m.voter.confirmSubmit : m.voter.submit}</button>
    {:else}
      <button class="cast" type="button" onclick={onnext} disabled={(step === "rules" && !agreed) || (step === "question" && chosen === "")}>{m.voter.next}</button>
    {/if}
    </div>
  {/if}
</div>
