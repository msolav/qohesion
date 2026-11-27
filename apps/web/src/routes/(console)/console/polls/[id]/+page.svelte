<script lang="ts">
  import { enhance } from "$app/forms";
  import CopyButton from "#lib/components/CopyButton.svelte";
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

{#if form?.countingKey}
  <div class="cx-card" role="status" aria-labelledby="key-h">
    <h2 id="key-h">{m.seal.keyTitle}</h2>
    <p class="gap">{m.seal.keyText}</p>
    <code class="cx-key gap">{form.countingKey}</code>
    <p class="cx-notice warn gap">{m.seal.keyWarn}</p>
    <div class="cx-actions gap">
      <CopyButton text={form.countingKey} label={m.common.copy} done={m.common.copied} />
      <a class="cx-btn ghost" href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${poll.title}\n${form.countingKey}\n`)}`} download="qohesion-counting-key.txt">{m.start.download}</a>
    </div>
  </div>
{/if}
{#if form?.error && !form.step}<p class="cx-notice error" role="alert">{errorText(m, form.error)}</p>{/if}

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
    <p class="gap"><b>{m.seal.protection}</b><br />{poll.encrypted ? m.seal.sealed.title : m.seal.none.title}</p>
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
    <form class="cx-form gap" method="POST" action="?/close" use:enhance={confirmWith(m.poll.confirmClose)}>
      {#if poll.encrypted}
        <div class="cx-field" class:invalid={form?.step === "close"}>
          <label for="close-key">{m.seal.closeKeyLabel}</label>
          <input id="close-key" name="countingKey" type="password" class="mono-input" autocomplete="off" spellcheck="false" aria-describedby="close-key-help{form?.step === 'close' ? ' close-key-error' : ''}" required />
          <p class="cx-help" id="close-key-help">{m.seal.closeKeyHelp}</p>
          {#if form?.step === "close"}<p class="cx-error" id="close-key-error" role="alert">{errorText(m, form.error)}</p>{/if}
        </div>
      {/if}
      <div class="cx-actions">
        <button class="cx-btn" type="submit">{m.poll.closeNow}</button>
        <a class="cx-btn ghost" href="/console/polls/{poll.id}/roll">{m.poll.roll}</a>
      </div>
    </form>
  {:else if poll.encrypted && !poll.counted}
    <h2>{m.seal.countTitle}</h2>
    <p class="cx-help">{m.seal.countText}</p>
    <form class="cx-form gap" method="POST" action="?/count" use:enhance>
      <div class="cx-field" class:invalid={form?.step === "count"}>
        <label for="count-key">{m.seal.closeKeyLabel}</label>
        <input id="count-key" name="countingKey" type="password" class="mono-input" autocomplete="off" spellcheck="false" aria-describedby="{form?.step === 'count' ? 'count-key-error' : undefined}" required />
        {#if form?.step === "count"}<p class="cx-error" id="count-key-error" role="alert">{errorText(m, form.error)}</p>{/if}
      </div>
      <div class="cx-actions"><button class="cx-btn" type="submit">{m.seal.countSubmit}</button></div>
    </form>
  {:else}
    <div class="cx-actions"><a class="cx-btn" href="/console/polls/{poll.id}/results">{m.poll.results}</a></div>
  {/if}
</section>
