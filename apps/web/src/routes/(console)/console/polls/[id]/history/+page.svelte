<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const fmt = $derived(new Intl.DateTimeFormat(data.locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" }));
</script>

<h2>{m.history.title}</h2>
{#if data.items.length === 0}
  <p class="cx-help gap">{m.history.empty}</p>
{:else}
  <ol class="cx-history gap">
    {#each data.items as item, i (i)}
      <li>
        <time datetime={item.at}>{fmt.format(new Date(item.at))}</time>
        <span>{m.history.actions[item.action] ?? item.action}{#if item.detail} · <span class="mono">{item.detail}</span>{/if}</span>
        <span class="who">{item.actor}</span>
      </li>
    {/each}
  </ol>
{/if}
