<script lang="ts">
  import MethodsGuide from "#lib/components/MethodsGuide.svelte";
  import { guideMessages } from "#lib/i18n/guide.js";
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(messages[data.locale]);
  const g = $derived(guideMessages[data.locale]);
</script>

<svelte:head>
  <title>{g.methods.title} · {t.brand.name}</title>
  <meta name="description" content={g.methods.lede} />
</svelte:head>

<div class="page"><MethodsGuide locale={data.locale} /></div>
