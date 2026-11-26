<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const fmt = $derived(new Intl.DateTimeFormat(data.locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" }));
</script>

<svelte:head><title>{m.polls.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<div class="cx-title">
  <h1>{m.polls.title}</h1>
  <a class="cx-btn" href="/console/polls/new">{m.polls.create}</a>
</div>

{#if data.polls.length === 0}
  <div class="cx-empty">
    <h2>{m.polls.empty}</h2>
    <p>{m.polls.emptyText}</p>
    <a class="cx-btn" href="/console/polls/new">{m.polls.create}</a>
  </div>
{:else}
  <ul class="cx-list">
    {#each data.polls as poll (poll.id)}
      <li>
        <a class="cx-item" href="/console/polls/{poll.id}">
          <div>
            <h2>{poll.title}</h2>
            <p class="meta">
              {#if poll.rollCount !== null}<span>{m.polls.roll}: {poll.rollCount}</span>{/if}
              {#if poll.turnout !== null}<span>{m.polls.ballots}: {poll.turnout}</span>{/if}
              {#if poll.openedAt}<span>{m.polls.opened} {fmt.format(new Date(poll.openedAt))}</span>{/if}
              {#if poll.status === "open" && poll.closesAt}<span>{m.polls.closes} {fmt.format(new Date(poll.closesAt))}</span>{/if}
            </p>
          </div>
          <span class="cx-chip {poll.status}">{m.status[poll.status]}</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}
