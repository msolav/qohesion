<script lang="ts">
  import LedgerPanel from "#lib/components/LedgerPanel.svelte";
  import PublicationPanel from "#lib/components/PublicationPanel.svelte";
  import ResultsPanel from "#lib/components/ResultsPanel.svelte";
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const poll = $derived(data.poll);
</script>

{#if data.results}
  {#key poll.status}
    <ResultsPanel locale={data.locale} pollId={poll.id} options={poll.options} timing={poll.timing} audience={poll.audience} markFill={poll.markFill} initial={data.results} />
  {/key}
  {#if data.publication}<PublicationPanel locale={data.locale} publication={data.publication} options={poll.options} pollId={poll.id} />{/if}
{#if data.ledger}<LedgerPanel locale={data.locale} ledger={data.ledger} check={form?.check ?? null} />
  {:else if poll.status === "open"}<p class="cx-help gap">{m.results.ledgerNotYet}</p>{/if}
{:else}
  <p class="cx-notice warn">{m.poll.draftNote}</p>
{/if}
