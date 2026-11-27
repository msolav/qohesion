<script lang="ts">
  import PollForm from "#lib/components/PollForm.svelte";
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
</script>

<svelte:head><title>{m.form.newTitle} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<div class="cx-title"><h1>{m.form.newTitle}</h1></div>
<PollForm locale={data.locale} submit={m.form.create} initial={form?.input ?? null} error={form?.error ?? null} defaultTheme={data.theme} timeZone={data.timeZone} defaultCloses={data.defaultCloses} />
