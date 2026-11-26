<script lang="ts">
  import { enhance } from "$app/forms";
  import { consoleMessages, errorText } from "#lib/i18n/console.js";
  import { optionLabel } from "#lib/option-labels.js";
  import { liveResultsWarning } from "#lib/results-rules.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const poll = $derived(data.poll);
  const fmt = $derived(new Intl.DateTimeFormat(data.locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long", timeStyle: "short" }));
  const warn = $derived(liveResultsWarning(poll.timing, data.rollSize));

  function confirmWith(message: string) {
    return ({ cancel }: { cancel: () => void }) => {
      if (!confirm(message)) cancel();
    };
  }
</script>

{#if form?.error}<p class="cx-notice error" role="alert">{errorText(m, form.error)}</p>{/if}

<p class="cx-notice" class:warn={poll.status === "draft"}>
  {poll.status === "draft" ? m.poll.draftNote : poll.status === "open" ? m.poll.openNote2 : m.poll.closedNote}
</p>
{#if warn}<p class="cx-notice warn" role="note">{m.form.smallRoll}</p>{/if}

<section class="cx-section" aria-labelledby="facts-h">
  <h2 id="facts-h" class="gap">{m.poll.facts}</h2>
  <dl class="cx-stats">
    <div class="cx-stat"><dt>{m.poll.rollCount}</dt><dd>{poll.rollCount ?? data.rollSize}</dd></div>
    <div class="cx-stat"><dt>{m.poll.voted}</dt><dd>{data.turnout ?? "–"}</dd></div>
    <div class="cx-stat">
      <dt>{m.poll.turnout}</dt>
      <dd>{#if data.turnout !== null && (poll.rollCount ?? 0) > 0}{Math.round((data.turnout / (poll.rollCount ?? 1)) * 100)}<small> %</small>{:else}–{/if}</dd>
    </div>
    <div class="cx-stat"><dt>{m.poll.rollCode}</dt><dd class="code">{poll.rollCode ?? "–"}</dd></div>
  </dl>
  {#if poll.rollCode}<p class="cx-help gap">{m.poll.rollCodeNote}</p>{/if}
</section>

<section class="cx-section" aria-labelledby="settings-h">
  <div class="cx-title">
    <h2 id="settings-h">{m.poll.settings}</h2>
    {#if poll.status === "draft"}<a class="cx-btn ghost small" href="/console/polls/{poll.id}/edit">{m.poll.edit}</a>{/if}
  </div>
  <div class="cx-card">
    {#if poll.description}<p>{poll.description}</p>{/if}
    <ul class="cx-tags gap">
      {#each poll.options as option (option.id)}<li>{optionLabel(data.locale, option)}</li>{/each}
    </ul>
    <p class="gap"><b>{m.poll.resultsRule}</b><br />{m.resultsStatement[poll.timing][poll.audience]}</p>
    <p class="cx-help gap">
      {#if poll.openedAt}{m.poll.openedAt} {fmt.format(new Date(poll.openedAt))} · {/if}
      {#if poll.status === "closed" && poll.closedAt}{m.poll.closedAt} {fmt.format(new Date(poll.closedAt))}
      {:else if poll.closesAt}{m.poll.closesAt} {fmt.format(new Date(poll.closesAt))}
      {:else}{m.poll.closesAt}: {m.poll.manual}{/if}
    </p>
  </div>
</section>

<section class="cx-section">
  {#if poll.status === "draft"}
    <p class="cx-help">{m.poll.openNote}</p>
    <div class="cx-actions gap">
      {#if data.rollSize > 0}
        <form method="POST" action="?/open" use:enhance={confirmWith(m.poll.confirmOpen)}><button class="cx-btn" type="submit">{m.poll.openNow}</button></form>
      {:else}
        <p class="cx-notice warn">{m.poll.openNeedsRoll} <a href="/console/polls/{poll.id}/roll">{m.poll.roll}</a></p>
      {/if}
      <form method="POST" action="?/remove" use:enhance={confirmWith(m.poll.confirmDelete)}><button class="cx-btn danger" type="submit">{m.poll.deletePoll}</button></form>
    </div>
  {:else if poll.status === "open"}
    <p class="cx-help">{m.poll.closeNote}</p>
    <div class="cx-actions gap">
      <form method="POST" action="?/close" use:enhance={confirmWith(m.poll.confirmClose)}><button class="cx-btn" type="submit">{m.poll.closeNow}</button></form>
      <a class="cx-btn ghost" href="/console/polls/{poll.id}/roll">{m.poll.roll}</a>
    </div>
  {:else}
    <div class="cx-actions"><a class="cx-btn" href="/console/polls/{poll.id}/results">{m.poll.results}</a></div>
  {/if}
</section>
