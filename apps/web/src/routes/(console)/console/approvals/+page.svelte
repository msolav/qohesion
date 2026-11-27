<script lang="ts">
  import ApprovalCard from "#lib/components/ApprovalCard.svelte";
  import { consoleMessages, errorText } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
</script>

<svelte:head><title>{m.approval.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<h1>{m.approval.title}</h1>
<p class="cx-help">{m.approval.lede}</p>
{#if data.administrators < 2}<p class="cx-notice gap" role="note">{m.approval.onlyOne}</p>{/if}
{#if form && "error" in form && form.error}<p class="cx-error gap" role="alert">{errorText(m, form.error)}</p>{/if}

<section class="cx-section" aria-labelledby="open-h">
  <h2 id="open-h">{m.approval.openTitle}</h2>
  {#if data.open.length === 0}
    <div class="cx-empty gap"><p>{m.approval.empty}</p></div>
  {:else}
    <div class="cx-approvals gap">
      {#each data.open as request (request.id)}
        <ApprovalCard {request} locale={data.locale} timeZone={data.timeZone} me={data.me} canAnswer={data.canAnswer} />
      {/each}
    </div>
  {/if}
</section>

{#if data.recent.length > 0}
  <section class="cx-section" aria-labelledby="recent-h">
    <h2 id="recent-h">{m.approval.recentTitle}</h2>
    <div class="cx-approvals gap">
      {#each data.recent as request (request.id)}
        <ApprovalCard {request} locale={data.locale} timeZone={data.timeZone} me={data.me} canAnswer={false} />
      {/each}
    </div>
  </section>
{/if}
