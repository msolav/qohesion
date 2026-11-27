<script lang="ts">
  import CopyButton from "#lib/components/CopyButton.svelte";
  import { consoleMessages, fill } from "#lib/i18n/console.js";
  import { formatMoment } from "#lib/zoned.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const record = $derived(data.record);
  const label = (kind: string) => (m.record.kinds as Record<string, string>)[kind] ?? kind;
  /** A short reading of an entry's details: the fields that say what happened, never a key. */
  const detail = (d: Readonly<Record<string, unknown>>): string =>
    ["label", "name", "answer", "kind", "poll", "rule"].filter((k) => k in d).map((k) => `${k}: ${String(d[k])}`).join(" · ");
</script>

<svelte:head><title>{m.record.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<h1>{m.record.title}</h1>
<p class="cx-help">{m.record.lede}</p>

<section class="cx-section" aria-labelledby="check-h">
  <h2 id="check-h">{m.record.checkpoint}</h2>
  <p class={record.intact ? "cx-notice" : "cx-notice error"} role="status">{record.intact ? m.record.intact : fill(m.record.broken, { n: record.brokenAt ?? 0 })}</p>
  <pre class="cx-key gap">{record.checkpoint}</pre>
  <div class="cx-actions gap">
    <CopyButton text={record.checkpoint} label={m.common.copy} done={m.common.copied} />
    <a class="cx-btn ghost" href="/console/record.json" download>{m.record.download}</a>
  </div>
  <p class="cx-help">{m.record.keepHelp}</p>
</section>

<section class="cx-section" aria-labelledby="entries-h">
  <h2 id="entries-h">{fill(m.record.entries, { n: record.size })}</h2>
  <div class="cx-wrap gap">
    <table class="stack">
      <thead><tr><th scope="col">{m.record.when}</th><th scope="col">{m.record.what}</th><th scope="col">{m.record.who}</th></tr></thead>
      <tbody>
        {#each record.entries as entry (entry.seq)}
          <tr>
            <td data-label={m.record.when}>{formatMoment(entry.at, data.locale, data.timeZone)}</td>
            <td data-label={m.record.what}>{label(entry.kind)}{#if detail(entry.detail)}<br /><span class="cx-help">{detail(entry.detail)}</span>{/if}</td>
            <td data-label={m.record.who}>{entry.actor}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
