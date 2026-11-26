<script lang="ts">
  import LedgerPanel from "#lib/components/LedgerPanel.svelte";
  import ResultsPanel from "#lib/components/ResultsPanel.svelte";
  import { consoleMessages } from "#lib/i18n/console.js";
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const t = $derived(messages[data.locale]);
</script>

<svelte:head><title>{m.results.title} · {data.poll.title} · {t.brand.name}</title><meta name="robots" content="noindex" /></svelte:head>

<div class="voter">
  <section class="cx-embed results-view">
    <h1 class="results-title">{data.poll.title}</h1>
    {#if data.results}
      {#key data.poll.status}
        <ResultsPanel locale={data.locale} pollId={data.poll.id} options={data.poll.options} timing={data.poll.timing} audience={data.poll.audience} initial={data.results} />
      {/key}
    {/if}
    {#if data.ledger}<LedgerPanel locale={data.locale} ledger={data.ledger} check={form?.check ?? null} />{/if}
  </section>
</div>
