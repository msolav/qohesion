<script lang="ts">
  import { enhance } from "$app/forms";
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import { formatMoment } from "#lib/zoned.js";
  import { messages } from "#lib/i18n/messages.js";
  import BallotView from "#lib/components/BallotView.svelte";
  import ReceiptActions from "#lib/components/ReceiptActions.svelte";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const t = $derived(messages[data.locale]);
  const receipt = $derived(form && "receipt" in form ? form.receipt : null);
  const failure = $derived(form && "error" in form ? form.error : null);
  const token = $derived(page.params["token"] ?? "");

  type Kind = "all" | "intro" | "rules" | "question" | "summary" | "confirm";
  interface Page {
    readonly kind: Kind;
    readonly qid?: string;
  }
  const questions = $derived(data.poll?.questions ?? []);
  // The pages of ADR 0008: introduction, rules, a page for each question, a summary when there are several questions,
  // and a check when the vote cannot be changed. The paged flow needs the script. Without it, the introduction links to
  // the same ballot on one page.
  const flow = $derived<readonly Page[]>(
    data.poll?.paged
      ? [
          { kind: "intro" },
          { kind: "rules" },
          ...questions.map((q): Page => ({ kind: "question", qid: q.id })),
          ...(questions.length > 1 ? [{ kind: "summary" } as Page] : []),
          ...(data.poll.allowChange ? [] : [{ kind: "confirm" } as Page]),
        ]
      : [{ kind: "all" }],
  );
  let at = $state(0);
  let answers = $state<Record<string, string>>({});
  let agreed = $state(false);
  let identity = $state({ name: "", reference: "" });
  const here = $derived(flow[Math.min(at, flow.length - 1)] ?? { kind: "all" as const });
  const step = $derived(here.kind);
  const failureQuestion = $derived(form && "question" in form && typeof form.question === "string" ? form.question : null);
  // A server error about the information asked sends the member to the page that asks for it.
  $effect(() => {
    if (!(form && "error" in form && typeof form.error === "string" && form.error.startsWith("identity_"))) return;
    const index = flow.findIndex((p) => p.kind === "rules" || p.kind === "all");
    if (index >= 0) at = index;
  });
  // A server error about one question sends the member to that question.
  $effect(() => {
    if (!failureQuestion) return;
    const index = flow.findIndex((p) => p.kind === "question" && p.qid === failureQuestion);
    if (index >= 0) at = index;
  });
  function edit(id: string): void {
    const index = flow.findIndex((p) => p.kind === "question" && p.qid === id);
    if (index >= 0) at = index;
  }
  const closed = $derived(data.poll?.closesAt ? new Date(data.poll.closesAt).getTime() <= Date.now() : false);

  function canLeave(from: Page): boolean {
    const collect = data.poll?.collect;
    const missing = from.kind === "rules" && collect !== undefined && ((collect.name === "required" && identity.name.trim() === "") || (collect.reference === "required" && identity.reference.trim() === ""));
    return !missing && !((from.kind === "rules" && !agreed) || (from.kind === "question" && (answers[from.qid ?? ""] ?? "") === ""));
  }
  function next(): void {
    if (at < flow.length - 1 && canLeave(here)) at += 1;
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
      {#if questions.length > 1}<p class="done__text">{fill(m.voter.doneMany, { n: questions.length })}</p>{/if}
      <p class="done__label">{m.voter.doneLabel}</p>
      <p class="done__code">{receipt}</p>
      {#if data.poll}<ReceiptActions locale={data.locale} code={receipt} title={data.poll.title} organization={data.organization ?? ""} pollId={data.poll.id} emailable={data.poll.emailReceipt} ties={data.poll.anonymity === "secret" && data.poll.receiptListed} outcome={form && "receiptMail" in form ? String(form.receiptMail) : null} />{/if}
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
          qid={here.qid ?? "q1"}
          bind:answers
          bind:agreed
          bind:identity
          {failureQuestion}
          onedit={edit}
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
