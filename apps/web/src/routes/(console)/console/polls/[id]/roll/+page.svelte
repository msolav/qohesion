<script lang="ts">
  import { enhance } from "$app/forms";
  import CopyButton from "#lib/components/CopyButton.svelte";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import { formatMoment } from "#lib/zoned.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  let addresses = $state("");
  const poll = $derived(data.poll);
  const report = $derived(form && "report" in form ? form.report : null);
  const failed = $derived(form && "error" in form ? form : null);
  const allLinks = $derived(data.entries.map((e) => `${e.address}\t${e.link}`).join("\n"));
  const mailReport = $derived(form && "mailReport" in form ? form.mailReport : null);
  const mailError = $derived(form && "mailError" in form ? form.mailError : null);
  // The box empties once the addresses have been added.
  $effect(() => {
    if (report) addresses = "";
  });
  const reasons = $derived({ invalid: m.roll.reasonInvalid, disposable: m.roll.reasonDisposable });
</script>

{#if poll.status !== "closed"}
  <section aria-labelledby="add-h">
    <h2 id="add-h">{m.roll.add}</h2>
    <form class="cx-form gap" method="POST" action="?/add" use:enhance>
      <div class="cx-field" class:invalid={failed}>
        <label class="sr-only" for="addresses">{m.roll.add}</label>
        <textarea id="addresses" name="addresses" rows="5" placeholder={m.roll.addPlaceholder} spellcheck="false" autocapitalize="none" aria-describedby="addresses-help{failed ? ' addresses-error' : ''}" bind:value={addresses}></textarea>
        <p class="cx-help" id="addresses-help">{m.roll.addHelp}</p>
        {#if failed}<p class="cx-error" id="addresses-error" role="alert">{errorText(m, failed.error)}</p>{/if}
      </div>
      <div class="cx-actions"><button class="cx-btn" type="submit">{m.roll.addSubmit}</button></div>
    </form>
    {#if report}
      <div class="cx-notice gap" role="status">
        <div>
          <p>{fill(m.roll.added, { n: report.added })} {#if report.duplicates > 0}{fill(m.roll.duplicates, { n: report.duplicates })}{/if}</p>
          {#if report.rejected.length > 0}
            <p><b>{m.roll.rejected}</b></p>
            <ul>{#each report.rejected as r (r.line)}<li><code>{r.line}</code> — {reasons[r.reason]}</li>{/each}</ul>
          {/if}
        </div>
      </div>
    {/if}
  </section>
{/if}

{#if poll.status === "open" || poll.status === "draft"}
  <section class="cx-section" aria-labelledby="mail-h">
    <h2 id="mail-h">{m.mail.title}</h2>
    {#if poll.status === "draft"}
      <p class="cx-help">{m.mail.onlyOpen}</p>
    {:else if !data.mailConfigured}
      <p class="cx-notice warn gap">{m.mail.notConfigured}</p>
    {:else}
      <p class="cx-help">{m.mail.text}</p>
      <form id="mail" class="cx-form gap" method="POST" action="?/send" use:enhance>
        <label class="cx-choice check"><input type="checkbox" name="permission" value="yes" /><span><b>{m.mail.attest}</b></span></label>
        {#if mailError}<p class="cx-error" role="alert">{errorText(m, mailError)}</p>{/if}
        <div class="cx-actions">
          <button class="cx-btn" type="submit" name="which" value="new" disabled={data.toSend.new === 0}>{fill(m.mail.sendNew, { n: data.toSend.new })}</button>
          <button class="cx-btn ghost" type="submit" name="which" value="reminder" disabled={data.toSend.reminder === 0}>{fill(m.mail.sendAll, { n: data.toSend.reminder })}</button>
        </div>
        {#if data.toSend.reminder === 0 && data.reminderAt}<p class="cx-help">{fill(m.mail.reminderWait, { date: formatMoment(data.reminderAt, data.locale, data.timeZone) })}</p>{/if}
      </form>
      {#if mailReport}
        <div class="cx-notice gap" class:error={mailReport.failed > 0} role="status">
          <div>
            {#if mailReport.nobody}<p>{m.mail.nothingToSend}</p>{:else}<p>{mailReport.sent === 1 ? m.mail.reportOne : fill(m.mail.report, { n: mailReport.sent })}</p>{/if}
            {#if mailReport.failed > 0}<p>{fill(m.mail.reportFailed, { n: mailReport.failed })} <code>{mailReport.problem}</code></p>{/if}
          </div>
        </div>
      {/if}
    {/if}
  </section>
{/if}

<section class="cx-section" aria-labelledby="roll-h">
  <div class="cx-title">
    <h2 id="roll-h">{m.roll.title} · {data.entries.length}</h2>
    {#if data.entries.length > 0}<CopyButton text={allLinks} label={m.roll.copyAll} done={m.common.copied} small />{/if}
  </div>
  {#if poll.status === "draft" || poll.status === "open"}<p class="cx-help">{m.roll.linksText}</p>{/if}

  {#if data.entries.length === 0}
    <div class="cx-empty gap"><p>{m.roll.empty}</p></div>
  {:else}
    <div class="cx-wrap gap">
      <table class="stack">
        <thead>
          <tr><th scope="col">{m.roll.address}</th><th scope="col">{m.roll.status}</th><th scope="col">{m.roll.day}</th><th scope="col"><span class="sr-only">{m.roll.link}</span></th></tr>
        </thead>
        <tbody>
          {#each data.entries as entry (entry.id)}
            <tr>
              <td class="addr">{entry.address}{#if poll.status === "open" && entry.status !== "voted"}<br /><span class="cx-help">{entry.invitedOn ? fill(m.mail.sentOn, { day: entry.invitedOn }) : m.mail.notYet}</span>{/if}</td>
              <td>
                <span class="cx-chip {entry.status === 'voted' ? 'open' : ''}">{m.member[entry.status]}</span>
                {#if entry.late}<span class="cx-chip late" title={m.roll.lateNote}>{m.roll.late}</span>{/if}
              </td>
              <td class:none={!entry.votedOn} data-label={m.roll.day}>{entry.votedOn ?? "–"}</td>
              <td>
                <div class="cx-actions">
                  {#if data.canSend && entry.status !== "voted"}<button class="cx-btn ghost small" type="submit" form="mail" name="which" value={entry.id}>{m.mail.sendOne}</button>{/if}
                  {#if poll.status !== "closed" && entry.status !== "voted"}<CopyButton text={entry.link} label={m.roll.copyLink} done={m.common.copied} small />{/if}
                  {#if poll.status === "draft"}
                    <form method="POST" action="?/remove" use:enhance>
                      <input type="hidden" name="entry" value={entry.id} />
                      <button class="cx-btn danger small" type="submit">{m.roll.remove}</button>
                    </form>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="cx-help gap">{m.roll.votedNote}</p>
  {/if}
</section>
