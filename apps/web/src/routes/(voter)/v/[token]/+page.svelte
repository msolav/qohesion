<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import { messages } from "#lib/i18n/messages.js";
  import { OPTION_GLYPHS, optionLabel } from "#lib/option-labels.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const t = $derived(messages[data.locale]);
  const receipt = $derived(form && "receipt" in form ? form.receipt : null);
  const failure = $derived(form && "error" in form ? form.error : null);
  const fmt = $derived(new Intl.DateTimeFormat(data.locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long", timeStyle: "short" }));
  const token = $derived(page.params["token"] ?? "");

  let doneHeading: HTMLElement | undefined = $state();
  $effect(() => {
    if (receipt) doneHeading?.focus();
  });
</script>

<svelte:head>
  <title>{data.state === "unknown" ? m.voter.unknownTitle : data.poll?.title} · {t.brand.name}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="voter">
  {#if data.state === "unknown"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.unknownTitle}</h2><p class="done__text">{m.voter.unknownText}</p></section>
  {:else if receipt}
    <section class="done" aria-labelledby="done-title">
      <svg class="done__icon" viewBox="0 0 48 48" width="56" height="56" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3" /><path d="M14 25l7 7 13-16" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
      <h2 id="done-title" tabindex="-1" bind:this={doneHeading}>{m.voter.doneTitle}</h2>
      <p class="done__text">{m.voter.doneText}</p>
      <p class="done__label">{m.voter.doneLabel}</p>
      <p class="done__code">{receipt}</p>
      <p class="receipt">{m.voter.doneNote}</p>
      {#if data.canSeeResults}<p class="done__next"><a href="/v/{token}/results">{m.voter.doneResults}</a></p>{/if}
    </section>
  {:else if data.state === "voted"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.votedTitle}</h2><p class="done__text">{m.voter.votedText}</p>{#if data.canSeeResults}<p class="done__next"><a href="/v/{token}/results">{m.voter.seeResults}</a></p>{/if}</section>
  {:else if data.state === "closed"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.closedTitle}</h2><p class="done__text">{m.voter.closedText}</p>{#if data.canSeeResults}<p class="done__next"><a href="/v/{token}/results">{m.voter.seeResults}</a></p>{/if}</section>
  {:else if data.state === "not_open"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.notOpenTitle}</h2><p class="done__text">{m.voter.notOpenText}</p></section>
  {:else if data.poll}
    <section class="ballot-view" aria-labelledby="q-title">
      <form class="ballot" method="POST" novalidate use:enhance>
        <div class="slip">
          <div class="ballot__head">
            <h1 id="q-title">{data.poll.title}</h1>
            {#if data.poll.description}<p class="lede">{data.poll.description}</p>{:else}<p class="lede">{m.voter.lede}</p>{/if}
          </div>

          <dl class="facts" aria-label={m.voter.facts}>
            <div>
              <dt>{m.voter.closes}</dt>
              <dd>{data.poll.closesAt ? fmt.format(new Date(data.poll.closesAt)) : m.voter.noClose}</dd>
            </div>
            <div>
              <dt>{m.voter.roll}</dt>
              <dd>{fill(m.voter.rollValue, { n: data.poll.rollCount ?? 0 })}</dd>
              <dd class="note">{fill(m.voter.rollNote, { code: data.poll.rollCode ?? "" })}</dd>
            </div>
            <div>
              <dt>{m.voter.ballotType}</dt>
              <dd>{m.voter.ballotValue}</dd>
              <dd class="note">{m.voter.ballotNote}</dd>
            </div>
            <div>
              <dt>{m.voter.results}</dt>
              <dd class="note">{m.resultsStatement[data.poll.timing][data.poll.audience]}</dd>
            </div>
          </dl>

          <fieldset class="choices" aria-describedby={failure ? "choice-error" : undefined}>
            <legend class="sr-only">{m.voter.legend}</legend>
            {#each data.poll.options as option (option.id)}
              <div class="choice">
                <input type="radio" name="choice" id="c-{option.id}" value={option.id} />
                <label for="c-{option.id}">
                  <span class="mark" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d={OPTION_GLYPHS[option.id] ?? OPTION_GLYPHS["for"]} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </span>
                  <span>{optionLabel(data.locale, option)}</span>
                </label>
              </div>
            {/each}
          </fieldset>

          {#if failure}<p class="error" id="choice-error" role="alert">{m.voter.problem} {errorText(m, failure)}</p>{/if}
        </div>

        <div class="castbar"><button class="cast" type="submit">{m.voter.submit}</button></div>
      </form>
    </section>
  {/if}
</div>
