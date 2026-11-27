<script lang="ts">
  import { page } from "$app/state";
  import { consoleMessages } from "#lib/i18n/console.js";
  import { messages } from "#lib/i18n/messages.js";
  import { LOCALES } from "#lib/i18n/negotiate.js";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  const m = $derived(consoleMessages[data.locale]);
  const t = $derived(messages[data.locale]);
  const session = $derived(data.session);
  const path = $derived(page.url.pathname);

  function switchTo(locale: string): string {
    const url = new URL(page.url.href);
    url.searchParams.set("lang", locale);
    return `${url.pathname}${url.search}`;
  }
  const names = $derived({ fr: t.shell.languageFr, en: t.shell.languageEn });
  const here = (prefix: string) => (path === prefix || path.startsWith(`${prefix}/`) ? "page" : undefined);
  const roleLabel = $derived(session ? (session.owner && session.administrator ? m.role.both : session.owner ? m.role.owner : m.role.administrator) : "");
</script>

<div class="cx">
  <a class="skip" href="#content">{t.shell.skip}</a>
  <div class="cx-edition" role="note">
    <div><strong>{m.edition.label}</strong><span>{m.edition.text}</span></div>
  </div>
  <header class="cx-top">
    <div>
      <a class="cx-brand" href={session ? "/console" : "/"}>
        <img src="/mark.svg" alt="" width="34" height="29" />
        <span>{data.spaceName ?? t.brand.name}</span>
      </a>
      {#if session}
        <nav class="cx-nav" aria-label={m.nav.label}>
          {#if session.administrator}<a href="/console/polls" aria-current={here("/console/polls")}>{m.nav.polls}</a>{/if}
          {#if session.owner}<a href="/console/space" aria-current={here("/console/space")}>{m.nav.space}</a>{/if}
        </nav>
      {:else}
        <span class="cx-nav"></span>
      {/if}
      <div class="cx-tools">
        {#if session}
          <span class="cx-who">{session.label}{#if !(session.owner && session.administrator)} · {roleLabel}{/if}</span>
          <form method="POST" action="/signout"><button class="cx-signout" type="submit">{m.nav.signOut}</button></form>
        {/if}
        <nav class="cx-lang" aria-label={t.shell.language}>
          {#each LOCALES as locale (locale)}
            <a href={switchTo(locale)} lang={locale} hreflang={locale} aria-label={names[locale]} aria-current={data.locale === locale ? "true" : undefined}>{locale.toUpperCase()}</a>
          {/each}
        </nav>
      </div>
    </div>
  </header>

  <main id="content" tabindex="-1" class="cx-main {path === '/start' || path === '/signin' ? 'narrow' : ''}">
    {@render children()}
  </main>

  <footer class="cx-foot">
    <div>{t.brand.name} · {t.shell.version} {data.build.display} · <a href={data.sourceUrl}>{t.shell.source}</a> · {t.shell.licence}</div>
  </footer>
</div>
