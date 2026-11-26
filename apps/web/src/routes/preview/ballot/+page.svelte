<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { resolveText } from "@qohesion/engine";
  import { previewBallot } from "#lib/ballot.js";
  import { messages } from "#lib/i18n/messages.js";
  import { THEMES } from "#lib/theme.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  const t = $derived(messages[data.locale]);
  const p = $derived(t.preview);
  const question = previewBallot.steps[0]?.questions[0];
  const options = question?.type === "single" ? question.options : [];
  const first = $derived(form?.errors?.["choice"]?.[0]);
  const done = $derived(form?.ok === true);

  let doneHeading: HTMLElement | undefined = $state();
  $effect(() => {
    if (done) doneHeading?.focus();
  });

  function themeHref(theme: string): string {
    const url = new URL(page.url.href);
    url.searchParams.set("theme", theme);
    return `${url.pathname}${url.search}`;
  }
  const templateNames = $derived({ "seed-packet": p.templateSeedPacket, "ballot-paper": p.templateBallotPaper });
</script>

<svelte:head>
  <title>{p.title} · {t.brand.name}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="voter">
  {#if done}
    <section class="done" aria-labelledby="done-title">
      <svg class="done__icon" viewBox="0 0 48 48" width="56" height="56" aria-hidden="true"
        ><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3" /><path
          d="M14 25l7 7 13-16"
          fill="none"
          stroke="currentColor"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round" /></svg>
      <h2 id="done-title" tabindex="-1" bind:this={doneHeading}>{p.doneTitle}</h2>
      <p class="done__text">{p.doneText}</p>
      <p class="done__label">{p.doneLabel}</p>
      <p class="done__code">K7QM-4X2R-9PTD</p>
      <p class="receipt">{p.doneExample}</p>
      <p class="receipt">{p.doneNote}</p>
      <p class="done__next"><a href={page.url.pathname} data-sveltekit-reload>{p.doneBack}</a></p>
    </section>
  {:else}
    <section class="ballot-view" aria-labelledby="q-title">
      <form class="ballot" method="POST" novalidate use:enhance>
        <div class="slip">
          <div class="ballot__head">
            <h1 id="q-title">{resolveText(previewBallot.title, data.locale)}</h1>
            <p class="lede">{p.lede}</p>
            <div class="when">
              <ol class="steps" aria-label={p.stepsLabel}>
                <li aria-current="step">1</li>
                <li>2</li>
                <li>3</li>
              </ol>
              <p>{p.closes}</p>
            </div>
          </div>

          <dl class="facts" aria-label={p.factsLabel}>
            <div>
              <dt>{p.quorum}</dt>
              <dd>{p.quorumValue}</dd>
              <dd class="note">{p.quorumNote}</dd>
            </div>
            <div>
              <dt>{p.passing}</dt>
              <dd>{p.passingValue}</dd>
              <dd class="note">{p.passingNote}</dd>
            </div>
            <div>
              <dt>{p.ballotType}</dt>
              <dd>{p.ballotTypeValue}</dd>
              <dd class="note">{p.ballotTypeNote}</dd>
            </div>
          </dl>

          <fieldset class="choices" aria-describedby={first ? "choice-error" : undefined}>
            <legend class="sr-only">{p.choiceLegend}</legend>
            {#each options as option (option.id)}
              <div class="choice">
                <input
                  type="radio"
                  name="choice"
                  id="c-{option.id}"
                  value={option.id} />
                <label for="c-{option.id}">
                  <span class="mark" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"
                      ><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </span>
                  <span>{resolveText(option.label, data.locale)}</span>
                </label>
              </div>
            {/each}
          </fieldset>

          {#if first}
            <p class="error" id="choice-error" role="alert">{p.errorSummary} {t.errors[first.code]}</p>
          {/if}

          <p class="receipt">{p.receiptNote}</p>
        </div>

        <div class="castbar">
          <button class="cast" type="submit">{p.submit}</button>
        </div>
      </form>
    </section>
  {/if}

  <nav class="templates" aria-label={p.templates}>
    <span>{p.templates}</span>
    {#each THEMES as theme (theme)}
      <a href={themeHref(theme)} aria-current={data.theme === theme ? "true" : undefined} data-sveltekit-reload>{templateNames[theme]}</a>
    {/each}
  </nav>
  <p class="sample">{p.sample}</p>
</div>
