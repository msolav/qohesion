<script lang="ts">
  import { enhance } from "$app/forms";
  import CopyButton from "#lib/components/CopyButton.svelte";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const poll = $derived(data.poll);
  const report = $derived(form && "report" in form ? form.report : null);
  const failed = $derived(form && "error" in form ? form : null);
  const allLinks = $derived(data.entries.map((e) => `${e.address}\t${e.link}`).join("\n"));
  const reasons = $derived({ invalid: m.roll.reasonInvalid, disposable: m.roll.reasonDisposable });
</script>

{#if poll.status !== "closed"}
  <section aria-labelledby="add-h">
    <h2 id="add-h">{m.roll.add}</h2>
    <form class="cx-form gap" method="POST" action="?/add" use:enhance>
      <div class="cx-field" class:invalid={failed}>
        <label class="sr-only" for="addresses">{m.roll.add}</label>
        <textarea id="addresses" name="addresses" rows="5" placeholder={m.roll.addPlaceholder} spellcheck="false" autocapitalize="none" aria-describedby="addresses-help{failed ? ' addresses-error' : ''}">{failed?.text ?? ""}</textarea>
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
              <td class="addr">{entry.address}</td>
              <td>
                <span class="cx-chip {entry.status === 'voted' ? 'open' : ''}">{m.member[entry.status]}</span>
                {#if entry.late}<span class="cx-chip late" title={m.roll.lateNote}>{m.roll.late}</span>{/if}
              </td>
              <td class:none={!entry.votedOn} data-label={m.roll.day}>{entry.votedOn ?? "–"}</td>
              <td>
                <div class="cx-actions">
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
