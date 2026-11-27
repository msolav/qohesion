<script lang="ts">
  import { page } from "$app/state";
  import LedgerPanel from "#lib/components/LedgerPanel.svelte";
  import ResultsPanel from "#lib/components/ResultsPanel.svelte";
  import { consoleMessages } from "#lib/i18n/console.js";
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const t = $derived(messages[data.locale]);
  const token = $derived(page.params["token"] ?? "");
</script>

<svelte:head><title>{m.results.title} · {data.poll.title} · {t.brand.name}</title><meta name="robots" content="noindex" /></svelte:head>

<div class="voter">
  <section class="cx-embed results-view">
    <h1 class="results-title">{data.poll.title}</h1>
    {#if data.results}
      {#key data.poll.status}
        <ResultsPanel locale={data.locale} pollId={data.poll.id} options={data.poll.options} timing={data.poll.timing} audience={data.poll.audience} markFill={data.poll.markFill} initial={data.results} {token} />
      {/key}
    {/if}
    {#if data.ledger}<LedgerPanel locale={data.locale} ledger={data.ledger} check={form?.check ?? null} />{/if}
    <p class="results-back"><a href="/v/{token}">← {m.common.back}</a></p>
  </section>
</div>
