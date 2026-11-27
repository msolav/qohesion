<script lang="ts">
  import { consoleMessages, errorText, fill, rulesSentence } from "#lib/i18n/console.js";
  import type { CloseRules } from "#lib/close-rules.js";
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
    readonly description: string;
    readonly options: readonly BallotOption[];
    readonly timing: ResultsTiming;
    readonly audience: ResultsAudience;
    readonly encrypted: boolean;
    readonly markFill: boolean;
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
  let { locale, poll, failure = null, preview = false }: { locale: Locale; poll: BallotPoll; failure?: string | null; preview?: boolean } = $props();

  const m = $derived(consoleMessages[locale]);
  const when = (iso: string) => formatMoment(iso, locale, poll.timeZone ?? DEFAULT_TIME_ZONE);
  const check = "M3.5 8.5l3 3 6-7";
</script>

<div class="slip">
  <div class="ballot__head">
    <h1 id="q-title">{poll.title || "…"}</h1>
    {#if poll.description}<p class="lede">{poll.description}</p>{:else}<p class="lede">{m.voter.lede}</p>{/if}
  </div>

  <dl class="facts" aria-label={m.voter.facts}>
    <div>
      <dt>{m.voter.closes}</dt>
      <dd>{poll.closesAt ? when(poll.closesAt) : m.voter.noClose}</dd>
      {#if rulesSentence(m, poll.rules)}<dd class="note">{rulesSentence(m, poll.rules)}</dd>{/if}
    </div>
    <div>
      <dt>{m.voter.roll}</dt>
      <dd>{poll.rollCount === null ? "—" : fill(m.voter.rollValue, { n: poll.rollCount })}</dd>
      {#if poll.rollCode}<dd class="note">{fill(m.voter.rollNote, { code: poll.rollCode })}</dd>{/if}
    </div>
    <div>
      <dt>{m.voter.ballotType}</dt>
      <dd>{m.voter.ballotValue}, {poll.encrypted ? m.seal.factSealed.toLowerCase() : m.seal.factPlain.toLowerCase()}</dd>
      <dd class="note">{m.voter.ballotNote} {poll.encrypted ? m.seal.ballotSealed : m.seal.ballotPlain}</dd>
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

  <fieldset class="choices" data-fill={poll.markFill ? "" : undefined} aria-describedby={failure ? "choice-error" : undefined}>
    <legend class="sr-only">{m.voter.legend}</legend>
    {#each poll.options as option, i (option.id)}
      {@const icon = iconOf(option)}
      <div class="choice" data-color={option.color ?? undefined} data-icon={option.icon ? option.icon : undefined}>
        <input type="radio" name="choice" id="c-{option.id}" value={option.id} disabled={preview} />
        <label for="c-{option.id}">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d={iconPath(icon) ?? check} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
          <span>{optionLabel(locale, option) || `${m.form.optionN.replace("{n}", String(i + 1))}`}</span>
        </label>
      </div>
    {/each}
  </fieldset>

  {#if failure}<p class="error" id="choice-error" role="alert">{m.voter.problem} {errorText(m, failure)}</p>{/if}
</div>

<div class="castbar"><button class="cast" type={preview ? "button" : "submit"} disabled={preview}>{m.voter.submit}</button></div>
