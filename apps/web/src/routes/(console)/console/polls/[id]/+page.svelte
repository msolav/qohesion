<script lang="ts">
  import { enhance } from "$app/forms";
  import ConfirmAction from "#lib/components/ConfirmAction.svelte";
  import CopyButton from "#lib/components/CopyButton.svelte";
  import RollStrip from "#lib/components/RollStrip.svelte";
  import { consoleMessages, errorText, fill, rulesSentence } from "#lib/i18n/console.js";
  import { optionLabel } from "#lib/option-labels.js";
  import { liveResultsWarning } from "#lib/results-rules.js";
  import { formatMoment } from "#lib/zoned.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const poll = $derived(data.poll);
  const at = (iso: string) => formatMoment(iso, data.locale, data.timeZone);
  const warn = $derived(liveResultsWarning(poll.timing, data.rollSize));
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

{#if poll.status === "draft" || poll.status === "scheduled" || poll.status === "cancelled"}<p class="cx-notice" class:warn={poll.status === "draft"}>
  {poll.status === "draft" ? m.poll.draftNote : poll.status === "cancelled" ? m.poll.cancelledNote : poll.status === "scheduled" ? fill(m.poll.scheduledNote, { date: poll.opensAt ? at(poll.opensAt) : "" }) : poll.status === "open" ? m.poll.openNote2 : m.poll.closedNote}
</p>{/if}
{#if warn}<p class="cx-notice warn" role="note">{m.form.smallRoll}</p>{/if}

<section class="cx-section first" aria-labelledby="facts-h">
  <h2 id="facts-h">{m.poll.facts}</h2>
  <div class="cx-ticket gap">
    <div class="cx-turnout">
      <p class="figure"><b>{data.turnout ?? 0}</b><span>{m.results.of} {poll.rollCount ?? data.rollSize}</span></p>
      <p class="cx-help">{m.poll.voted}{#if data.turnout !== null && (poll.rollCount ?? 0) > 0}<span class="sep" aria-hidden="true">·</span>{Math.round((data.turnout / (poll.rollCount ?? 1)) * 100)} %{/if}</p>
      <RollStrip total={poll.rollCount ?? data.rollSize} voted={data.turnout ?? 0} label={`${data.turnout ?? 0} ${m.results.of} ${poll.rollCount ?? data.rollSize}`} />
    </div>
    {#if poll.rollCode}
      <div class="cx-stub">
        <p class="cx-help">{m.poll.rollCode}</p>
        <p class="code">{poll.rollCode}</p>
        <p class="cx-help">{m.poll.rollCodeNote}</p>
      </div>
    {/if}
  </div>
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
    {#if rulesSentence(m, poll.rules)}<p class="gap">{rulesSentence(m, poll.rules)}</p>{/if}
    {#if poll.allowChange}<p class="gap">{m.voter.changeAllowed}</p>{/if}
    <dl class="cx-dates gap">
      {#if poll.openedAt}<div><dt>{m.poll.openedAt}</dt><dd>{at(poll.openedAt)}</dd></div>
      {:else if poll.opensAt}<div><dt>{m.poll.opensOn}</dt><dd>{at(poll.opensAt)}</dd></div>{/if}
      <div>
        <dt>{poll.status === "closed" ? m.poll.closedAt : m.poll.closesAt}</dt>
        <dd>{poll.status === "closed" && poll.closedAt ? at(poll.closedAt) : poll.closesAt ? at(poll.closesAt) : m.poll.noDeadline}</dd>
      </div>
    </dl>
  </div>
</section>

<section class="cx-section">
  {#if poll.status === "draft"}
    <p class="cx-help">{m.poll.openNote}</p>
    <div class="cx-actions gap">
      {#if data.rollSize > 0}
        {#if poll.opensAt}
          <form id="f-schedule" method="POST" action="?/schedule" use:enhance></form>
          <button class="cx-btn" type="submit" form="f-schedule">{m.poll.scheduleNow}</button>
          <form id="f-open" method="POST" action="?/open" use:enhance></form>
          <ConfirmAction formId="f-open" label={m.poll.openNow} message={m.poll.confirmOpen} backLabel={m.common.back} kind="ghost" />
        {:else}
          <form id="f-open" method="POST" action="?/open" use:enhance></form>
          <ConfirmAction formId="f-open" label={m.poll.openNow} message={m.poll.confirmOpen} backLabel={m.common.back} />
        {/if}
      {:else}
        <p class="cx-notice warn">{m.poll.openNeedsRoll} <a href="/console/polls/{poll.id}/roll">{m.poll.roll}</a></p>
      {/if}
      <form id="f-remove" method="POST" action="?/remove" use:enhance></form>
      <ConfirmAction formId="f-remove" label={m.poll.deletePoll} message={m.poll.confirmDelete} backLabel={m.common.back} kind="danger" />
    </div>
  {:else if poll.status === "scheduled"}
    <p class="cx-help">{m.poll.scheduleNote}</p>
    <div class="cx-actions gap">
      <form id="f-open" method="POST" action="?/open" use:enhance></form>
      <ConfirmAction formId="f-open" label={m.poll.openInstead} title={m.poll.openNow} message={m.poll.confirmOpen} confirmLabel={m.poll.openNow} backLabel={m.common.back} kind="ghost" />
      <form id="f-unschedule" method="POST" action="?/unschedule" use:enhance></form>
      <button class="cx-btn ghost" type="submit" form="f-unschedule">{m.poll.unschedule}</button>
      <form id="f-cancel" method="POST" action="?/cancel" use:enhance></form>
      <ConfirmAction formId="f-cancel" label={m.poll.cancelNow} message={m.poll.confirmCancel} backLabel={m.common.back} kind="danger" />
    </div>
  {:else if poll.status === "open"}
    <p class="cx-help">{m.poll.closeNote}</p>
    <form id="f-close" class="cx-form gap" method="POST" action="?/close" use:enhance>
      {#if poll.encrypted}
        <div class="cx-field" class:invalid={form?.step === "close"}>
          <label for="close-key">{m.seal.closeKeyLabel}</label>
          <input id="close-key" name="countingKey" type="password" class="mono-input" autocomplete="off" spellcheck="false" aria-describedby="close-key-help{form?.step === 'close' ? ' close-key-error' : ''}" required />
          <p class="cx-help" id="close-key-help">{m.seal.closeKeyHelp}</p>
          {#if form?.step === "close"}<p class="cx-error" id="close-key-error" role="alert">{errorText(m, form.error)}</p>{/if}
        </div>
      {/if}
    </form>
    <div class="cx-actions gap">
      <ConfirmAction formId="f-close" label={m.poll.closeNow} message={m.poll.confirmClose} backLabel={m.common.back} />
      <form id="f-cancel" method="POST" action="?/cancel" use:enhance></form>
      <ConfirmAction formId="f-cancel" label={m.poll.cancelNow} message={m.poll.confirmCancel} backLabel={m.common.back} kind="danger" />
    </div>
    <p class="cx-help gap">{m.poll.cancelNote}</p>
  {:else if poll.status === "cancelled"}
    <p class="cx-help">{m.poll.cancelledNote}</p>
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
    <form id="f-cancel" method="POST" action="?/cancel" use:enhance></form>
    <div class="cx-actions gap"><ConfirmAction formId="f-cancel" label={m.poll.cancelNow} message={m.poll.confirmCancel} backLabel={m.common.back} kind="danger" /></div>
  {:else}
    <div class="cx-actions"><a class="cx-btn" href="/console/polls/{poll.id}/results">{m.poll.results}</a></div>
  {/if}
</section>
