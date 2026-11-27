<script lang="ts">
  import { enhance } from "$app/forms";
  import { tick } from "svelte";
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

  type Step = "all" | "intro" | "rules" | "question" | "confirm";
  // The paged flow needs the script. Without it, the introduction links to the same ballot on one page.
  const flow = $derived<readonly Step[]>(data.poll?.paged ? ["intro", "rules", "question", ...(data.poll.allowChange ? [] : (["confirm"] as const))] : ["all"]);
  let at = $state(0);
  let chosen = $state("");
  let agreed = $state(false);
  const step = $derived(flow[Math.min(at, flow.length - 1)] ?? "all");
  const closed = $derived(data.poll?.closesAt ? new Date(data.poll.closesAt).getTime() <= Date.now() : false);

  function canLeave(from: Step): boolean {
    return !((from === "rules" && !agreed) || (from === "question" && chosen === ""));
  }
  function next(): void {
    if (at < flow.length - 1 && canLeave(step)) at += 1;
  }
  function back(): void {
    if (at > 0) at -= 1;
  }
  let moved = false;
  $effect(() => {
    void at;
    if (!moved) {
      moved = true;
      return;
    }
    void tick().then(() => document.getElementById("q-title")?.focus());
  });

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
      {#if data.poll?.allowChange}<p class="receipt">{m.voter.doneChange}</p>{/if}
      {#if data.poll?.closesAt && !closed}
        <p class="receipt">{fill(m.voter.doneDeadline, { date: formatMoment(data.poll.closesAt, data.locale, data.poll.timeZone) })}</p>
        <p class="done__next"><a href="/v/{token}/calendar.ics" data-sveltekit-reload>{m.voter.addToCalendar}</a></p>
      {/if}
      {#if data.canSeeResults}<p class="done__next"><a href="/v/{token}/results">{m.voter.doneResults}</a></p>{/if}
    </section>
  {:else if data.state === "voted"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.votedTitle}</h2><p class="done__text">{m.voter.votedText}</p>{#if data.canSeeResults}<p class="done__next"><a href="/v/{token}/results">{m.voter.seeResults}</a></p>{/if}</section>
  {:else if data.state === "closed"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.closedTitle}</h2><p class="done__text">{m.voter.closedText}</p>{#if data.canSeeResults}<p class="done__next"><a href="/v/{token}/results">{m.voter.seeResults}</a></p>{/if}</section>
  {:else if data.state === "cancelled"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.cancelledTitle}</h2><p class="done__text">{m.voter.cancelledText}</p>{#if data.poll?.cancelled && data.poll.closedAt}<p class="receipt">{fill(data.poll.cancelled.ballots === 0 ? m.voter.cancelledDetailNone : m.voter.cancelledDetail, { date: formatMoment(data.poll.closedAt, data.locale, data.poll.timeZone), who: data.poll.cancelled.by, n: data.poll.cancelled.ballots })}</p>{/if}</section>
  {:else if data.state === "not_open"}
    <section class="done" aria-labelledby="t"><h2 id="t">{m.voter.notOpenTitle}</h2><p class="done__text">{data.poll?.opensAt ? fill(m.voter.opensOn, { date: formatMoment(data.poll.opensAt, data.locale, data.poll.timeZone) }) : m.voter.notOpenText}</p></section>
  {:else if data.poll}
    <section class="ballot-view" aria-labelledby="q-title">
      <form
        class="ballot"
        method="POST"
        novalidate
        use:enhance={({ cancel }) => {
          // Enter on an earlier page moves on instead of sending the ballot.
          if (at < flow.length - 1) {
            cancel();
            next();
          }
        }}>
        {#if "alreadyVoted" in data && data.alreadyVoted}<p class="receipt">{m.voter.alreadyVotedChange}</p>{/if}
        <BallotView
          locale={data.locale}
          poll={data.poll}
          {failure}
          {step}
          bind:chosen
          bind:agreed
          organization={data.organization ?? ""}
          calendarHref="/v/{token}/calendar.ics"
          stepNo={at + 1}
          stepTotal={flow.length}
          onnext={next}
          onback={back} />
      </form>
    </section>
  {/if}
</div>
