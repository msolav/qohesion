<script lang="ts">
  import { page } from "$app/state";
  import { consoleMessages } from "#lib/i18n/console.js";
  import { messages } from "#lib/i18n/messages.js";
  import { LOCALES } from "#lib/i18n/negotiate.js";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  const t = $derived(messages[data.locale]);
  const organization = $derived(typeof page.data["organization"] === "string" ? page.data["organization"] : t.brand.name);

  /** Same page in another language. A full page load, so the language of the document changes with it. */
  function switchTo(locale: string): string {
    const url = new URL(page.url.href);
    url.searchParams.set("lang", locale);
    return `${url.pathname}${url.search}`;
  }

  const names = $derived({ fr: t.shell.languageFr, en: t.shell.languageEn });
</script>

<a class="skip" href="#content">{t.shell.skip}</a>

<div class="stage">
  <div class="app">
    <header class="bar">
      <a class="org" href="/">
        <img src="/mark.svg" alt="" width="34" height="29" />
        <span>{organization}</span>
      </a>
      <nav class="lang" aria-label={t.shell.language}>
        {#each LOCALES as locale (locale)}
          <a
            href={switchTo(locale)}
            lang={locale}
            hreflang={locale}
            aria-label={names[locale]}
            aria-current={data.locale === locale ? "true" : undefined}>{locale.toUpperCase()}</a>
        {/each}
      </nav>
    </header>

    <main id="content" tabindex="-1">
      {@render children()}
    </main>

    <footer class="foot">
      <p class="meta">
        {t.brand.name}<span class="sep" aria-hidden="true">·</span>{t.shell.version}
        <a href="/version">{data.build.display}</a>{#if data.build.commit}<span class="sep" aria-hidden="true">·</span>{t.shell.build}
          <span>{data.build.commit}</span>{/if}
      </p>
      <p>
        <a href="/changelog">{t.changelog.link}</a><span class="sep" aria-hidden="true">·</span><a href={data.sourceUrl}>{t.shell.source}</a><span class="sep" aria-hidden="true">·</span>{t.shell.licence}
      </p>
    </footer>
  </div>
</div>
