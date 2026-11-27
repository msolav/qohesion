<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import RollStrip from "#lib/components/RollStrip.svelte";
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { formatMoment } from "#lib/zoned.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const fmt = $derived({ format: (d: Date) => formatMoment(d.toISOString(), data.locale, data.timeZone) });
</script>

<svelte:head><title>{m.polls.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<div class="cx-title">
  <h1>{m.polls.title}</h1>
  <a class="cx-btn" href="/console/polls/new">{m.polls.create}</a>
</div>

{#if data.polls.length === 0}
  <div class="cx-empty">
    <svg class="ballot-box" viewBox="0 0 120 96" width="120" height="96" aria-hidden="true" focusable="false">
      <path d="M22 44h76v40a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
      <path d="M40 44V34h40v10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
      <path d="M46 40h28" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
      <g class="slip"><path d="M48 8h24v34H48z" fill="none" stroke="var(--mint)" stroke-width="2.4" stroke-linejoin="round" /><path d="M54 22l4 4 8-9" fill="none" stroke="var(--mint)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></g>
    </svg>
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
          <div class="side">
            {#if poll.rollCount}<RollStrip total={poll.rollCount} voted={poll.turnout ?? 0} label={`${poll.turnout ?? 0} ${m.results.of} ${poll.rollCount}`} />{/if}
            <span class="cx-chip {poll.status}">{m.status[poll.status]}</span>
          </div>
        </a>
      </li>
    {/each}
  </ul>
{/if}
