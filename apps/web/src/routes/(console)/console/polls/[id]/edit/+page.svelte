<script lang="ts">
  import PollForm from "#lib/components/PollForm.svelte";
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
</script>

<h2>{m.form.editTitle}</h2>
<div class="gap"></div>
<PollForm locale={data.locale} submit={m.common.save} initial={form?.input ?? data.input} error={form?.error ?? null} defaultTheme={data.input.theme} timeZone={data.timeZone} />
