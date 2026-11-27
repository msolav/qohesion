<script lang="ts">
  import { enhance } from "$app/forms";
  import ApprovalCard from "#lib/components/ApprovalCard.svelte";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
</script>

<svelte:head><title>{m.approval.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<h1>{m.approval.title}</h1>
<p class="cx-help">{m.approval.lede}</p>
{#if data.administrators < 2}<p class="cx-notice gap" role="note">{m.approval.onlyOne}</p>{/if}
{#if form && "error" in form && form.error}<p class="cx-error gap" role="alert">{errorText(m, form.error)}</p>{/if}

{#if data.setup}
  {@const setup = data.setup}
  <section class="cx-section" aria-labelledby="setup-h">
    <h2 id="setup-h">{m.approval.setupTitle}</h2>
    <p class="cx-help">{m.approval.setupText}</p>
    <dl class="bld-review gap">
      <div><dt>{m.space.name}</dt><dd>{setup.name}</dd></div>
      <div><dt>{m.space.language}</dt><dd>{setup.locale === "en" ? "English" : "Français"}</dd></div>
      <div><dt>{m.space.timeZone}</dt><dd>{setup.timeZone}</dd></div>
      <div><dt>{m.approval.ruleLabel}</dt><dd>{m.approval.rules[setup.policy.rule]}</dd></div>
    </dl>
    <h3>{m.approval.setupAdmins}</h3>
    <ul class="cx-answers">
      {#each setup.administrators as a (a.id)}
        <li><b>{a.label}</b> {a.confirmed ? m.approval.setupDone : m.approval.setupNotYet}</li>
      {/each}
    </ul>
    <p class="cx-help">{fill(m.approval.setupConfirmedBy, { n: setup.administrators.filter((a) => a.confirmed).length, total: setup.administrators.length })}</p>
    {#if data.canAnswer}
      <form method="POST" action="?/confirm" use:enhance class="cx-actions">
        <input type="hidden" name="digest" value={setup.digest} />
        <button class="cx-btn" type="submit" disabled={setup.administrators.find((a) => a.id === data.me)?.confirmed ?? false}>{m.approval.setupConfirm}</button>
      </form>
    {/if}
  </section>
{/if}

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
