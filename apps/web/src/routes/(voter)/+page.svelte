<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(messages[data.locale]);
  const c = $derived(consoleMessages[data.locale]);
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
      {#if data.edition === "test"}
        <li><a href={data.session ? "/console" : "/start"}>{data.session ? c.nav.polls : c.nav.start}<small>{c.edition.label}</small></a></li>
        {#if !data.session}<li><a href="/signin">{c.nav.signIn}<small>{c.signin.lede}</small></a></li>{/if}
      {/if}
      <li><a href="/preview/ballot">{t.home.previewLink}<small>{t.home.previewNote}</small></a></li>
      <li><a href="/changelog">{t.changelog.link}<small>{t.changelog.linkNote}</small></a></li>
      <li><a href="/version">{t.home.versionLink}<small>{t.home.versionNote}</small></a></li>
    </ul>
  </section>
</div>
