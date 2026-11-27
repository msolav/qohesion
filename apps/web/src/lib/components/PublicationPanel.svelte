<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { optionLabel } from "#lib/option-labels.js";

  /** The published count of a poll: the key, and every ballot with its receipt code and its choice, to add up and to check. */
  let {
    locale,
    publication,
    options,
    pollId,
    token = null,
  }: {
    locale: Locale;
    publication: { countingKey: string | null; ballots: readonly { receipt: string; choice: string; replaced: boolean }[] };
    options: readonly { id: string; label: string | null }[];
    pollId: string;
    token?: string | null;
  } = $props();
  const m = $derived(consoleMessages[locale]);
  const labelOf = (id: string) => {
    const o = options.find((x) => x.id === id);
    return o ? optionLabel(locale, o) : id;
  };
</script>

<section class="cx-section" aria-labelledby="pub-h">
  <h2 id="pub-h">{m.results.publicationTitle}</h2>
  <p>{m.results.publicationText}</p>
  {#if publication.countingKey}
    <h3 class="gap">{m.results.publicationKey}</h3>
    <p class="cx-help">{m.results.publicationKeyText}</p>
    <code class="cx-key gap">{publication.countingKey}</code>
  {/if}
  <div class="cx-wrap gap">
    <table>
      <thead><tr><th scope="col">{m.results.receiptColumn}</th><th scope="col">{m.results.choiceColumn}</th></tr></thead>
      <tbody>
        {#each publication.ballots as b (b.receipt)}
          <tr><td class="mono">{b.receipt}</td><td>{labelOf(b.choice)}{#if b.replaced} <span class="cx-help">({m.results.replaced})</span>{/if}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="gap"><a class="cx-btn ghost small" href={`/api/ledger/${pollId}${token ? `?t=${encodeURIComponent(token)}` : ""}`}>{m.results.downloadLedger}</a></p>
</section>
