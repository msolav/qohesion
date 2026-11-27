<script lang="ts">
  import HowGuide from "#lib/components/HowGuide.svelte";
  import { guideMessages } from "#lib/i18n/guide.js";
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(messages[data.locale]);
  const g = $derived(guideMessages[data.locale]);
</script>

<svelte:head>
  <title>{g.how.title} · {t.brand.name}</title>
  <meta name="description" content={g.how.lede} />
</svelte:head>

<div class="page"><HowGuide locale={data.locale} /></div>
