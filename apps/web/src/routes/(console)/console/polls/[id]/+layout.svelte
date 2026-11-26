<script lang="ts">
  import { page } from "$app/state";
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const base = $derived(`/console/polls/${data.poll.id}`);
  const path = $derived(page.url.pathname);
  const tabs = $derived([
    { href: base, label: m.poll.overview },
    { href: `${base}/roll`, label: m.poll.roll },
    { href: `${base}/results`, label: m.poll.results },
    { href: `${base}/history`, label: m.poll.history },
  ]);
  const current = (href: string) => (href === base ? path === base || path === `${base}/edit` : path === href);
</script>

<svelte:head><title>{data.poll.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<p><a href="/console/polls">← {m.polls.title}</a></p>
<div class="cx-title tight">
  <div>
    <h1>{data.poll.title}</h1>
    <div class="cx-sub"><span class="cx-chip {data.poll.status}">{m.status[data.poll.status]}</span></div>
  </div>
</div>
<nav class="cx-tabs" aria-label={data.poll.title}>
  {#each tabs as tab (tab.href)}
    <a href={tab.href} aria-current={current(tab.href) ? "page" : undefined}>{tab.label}</a>
  {/each}
</nav>
{@render children()}
