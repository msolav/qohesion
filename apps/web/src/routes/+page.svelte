<script lang="ts">
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(messages[data.locale]);
</script>

<svelte:head>
  <title>{t.brand.name}</title>
  <meta name="description" content={t.home.statement} />
</svelte:head>

<div class="page">
  <section class="home" aria-labelledby="home-title">
    <h1 id="home-title">{t.brand.tagline}</h1>
    <p class="line">{t.home.statement}</p>
    <p class="state">{t.home.state}</p>
    <ul class="links">
      <li><a href="/preview/ballot">{t.home.previewLink}<small>{t.home.previewNote}</small></a></li>
      <li><a href="/version">{t.home.versionLink}<small>{t.home.versionNote}</small></a></li>
    </ul>
  </section>
</div>
