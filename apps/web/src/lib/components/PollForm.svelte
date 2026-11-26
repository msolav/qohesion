<script lang="ts">
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { AUDIENCES, TIMINGS, type ResultsAudience, type ResultsTiming } from "#lib/results-rules.js";
  import type { PollInput } from "#lib/server/service.js";
  import type { Theme } from "#lib/theme.js";

  let {
    locale,
    submit,
    initial,
    error,
    defaultTheme,
  }: { locale: Locale; submit: string; initial: PollInput | null; error: string | null; defaultTheme: Theme } = $props();

  const m = $derived(consoleMessages[locale]);

  const start = (() => initial)();
  let kind = $state<"yes-no" | "choice">(start?.kind ?? "yes-no");
  let timing = $state<ResultsTiming>(start?.timing ?? "close");
  let audience = $state<ResultsAudience>(start?.audience ?? "voters");
  let byHours = $state(start?.closeAfterHours != null);
  let options = $state<string[]>(start && start.options.length > 0 ? [...start.options] : ["", "", ""]);

  const statement = $derived(m.resultsStatement[timing][audience]);
  const fieldError = $derived(error ? errorText(m, error) : "");
  const optionsFailed = $derived(error !== null && error.startsWith("option"));
  const titleFailed = $derived(error !== null && error.startsWith("title"));
</script>

<form class="cx-form" method="POST" novalidate>
  {#if error && !optionsFailed && !titleFailed}
    <p class="cx-notice error" role="alert">{fieldError}</p>
  {/if}

  <div class="cx-field" class:invalid={titleFailed}>
    <label for="title">{m.form.question}</label>
    <input id="title" name="title" type="text" maxlength="140" value={start?.title ?? ""} aria-describedby="title-help{titleFailed ? ' title-error' : ''}" required />
    <p class="cx-help" id="title-help">{m.form.questionHelp}</p>
    {#if titleFailed}<p class="cx-error" id="title-error" role="alert">{fieldError}</p>{/if}
  </div>

  <div class="cx-field">
    <label for="description">{m.form.details} <span class="cx-help">({m.common.optional})</span></label>
    <textarea id="description" name="description" maxlength="2000" aria-describedby="description-help">{start?.description ?? ""}</textarea>
    <p class="cx-help" id="description-help">{m.form.detailsHelp}</p>
  </div>

  <fieldset class="cx-field">
    <legend class="cx-label">{m.form.kind}</legend>
    <div class="cx-choices cols-2">
      <label class="cx-choice"><input type="radio" name="kind" value="yes-no" bind:group={kind} /><span><b>{m.form.kindYesNo}</b><small>{m.form.kindYesNoText}</small></span></label>
      <label class="cx-choice"><input type="radio" name="kind" value="choice" bind:group={kind} /><span><b>{m.form.kindChoice}</b><small>{m.form.kindChoiceText}</small></span></label>
    </div>
  </fieldset>

  {#if kind === "choice"}
    <fieldset class="cx-field" class:invalid={optionsFailed}>
      <legend class="cx-label">{m.form.options}</legend>
      <p class="cx-help">{m.form.optionsHelp}</p>
      <ul class="cx-options">
        {#each options as _, i (i)}
          <li>
            <label class="sr-only" for="option-{i}">{fill(m.form.optionN, { n: i + 1 })}</label>
            <input id="option-{i}" name="option" type="text" maxlength="120" placeholder={fill(m.form.optionN, { n: i + 1 })} bind:value={options[i]} />
          </li>
        {/each}
      </ul>
      {#if optionsFailed}<p class="cx-error" role="alert">{fieldError}</p>{/if}
      {#if options.length < 12}
        <div><button type="button" class="cx-btn ghost small" onclick={() => options.push("")}>{m.form.addOption}</button></div>
      {/if}
    </fieldset>
  {/if}

  <section class="cx-field" aria-labelledby="results-h">
    <h2 id="results-h">{m.form.results}</h2>
    <p class="cx-help">{m.form.resultsHelp}</p>
  </section>

  <fieldset class="cx-field">
    <legend class="cx-label">{m.form.timing}</legend>
    <div class="cx-choices cols-2">
      {#each TIMINGS as value (value)}
        <label class="cx-choice"><input type="radio" name="timing" {value} bind:group={timing} /><span><b>{m.form.timingNames.title[value]}</b><small>{m.form.timingNames.text[value]}</small></span></label>
      {/each}
    </div>
  </fieldset>

  <fieldset class="cx-field">
    <legend class="cx-label">{m.form.audience}</legend>
    <div class="cx-choices cols-3">
      {#each AUDIENCES as value (value)}
        <label class="cx-choice"><input type="radio" name="audience" {value} bind:group={audience} /><span><b>{m.form.audienceNames.title[value]}</b><small>{m.form.audienceNames.text[value]}</small></span></label>
      {/each}
    </div>
  </fieldset>

  <div class="cx-preview" aria-live="polite"><b>{m.form.preview}</b>{statement}</div>

  <fieldset class="cx-field">
    <legend class="cx-label">{m.form.duration}</legend>
    <div class="cx-choices cols-2">
      <label class="cx-choice"><input type="radio" name="duration" value="manual" checked={!byHours} onchange={() => (byHours = false)} /><span><b>{m.form.durationManual}</b></span></label>
      <label class="cx-choice"><input type="radio" name="duration" value="hours" checked={byHours} onchange={() => (byHours = true)} /><span><b>{m.form.durationHours}</b></span></label>
    </div>
    {#if byHours}
      <div class="cx-field">
        <label for="hours">{m.form.durationHelp}</label>
        <input id="hours" name="hours" type="number" min="1" max="720" step="1" inputmode="numeric" value={start?.closeAfterHours ?? 72} />
      </div>
    {/if}
  </fieldset>

  <fieldset class="cx-field">
    <legend class="cx-label">{m.form.template}</legend>
    <div class="cx-choices cols-2">
      <label class="cx-choice"><input type="radio" name="theme" value="ballot-paper" checked={(start?.theme ?? defaultTheme) === "ballot-paper"} /><span><b>{m.form.templateBallot}</b></span></label>
      <label class="cx-choice"><input type="radio" name="theme" value="seed-packet" checked={(start?.theme ?? defaultTheme) === "seed-packet"} /><span><b>{m.form.templateSeed}</b></span></label>
    </div>
  </fieldset>

  <div class="cx-actions"><button class="cx-btn" type="submit">{submit}</button></div>
</form>
