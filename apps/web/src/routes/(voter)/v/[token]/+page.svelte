<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import { formatMoment } from "#lib/zoned.js";
  import { messages } from "#lib/i18n/messages.js";
  import BallotView from "#lib/components/BallotView.svelte";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const t = $derived(messages[data.locale]);
  const receipt = $derived(form && "receipt" in form ? form.receipt : null);
  const failure = $derived(form && "error" in form ? form.error : null);
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
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.notOpenTitle}</h2><p class="done__text">{data.poll?.opensAt ? fill(m.voter.opensOn, { date: formatMoment(data.poll.opensAt, data.locale, data.poll.timeZone) }) : m.voter.notOpenText}</p></section>
  {:else if data.poll}
    <section class="ballot-view" aria-labelledby="q-title">
      <form class="ballot" method="POST" novalidate use:enhance>
        {#if "alreadyVoted" in data && data.alreadyVoted}<p class="receipt">{m.voter.alreadyVotedChange}</p>{/if}
        <BallotView locale={data.locale} poll={data.poll} {failure} />
      </form>
    </section>
  {/if}
</div>
