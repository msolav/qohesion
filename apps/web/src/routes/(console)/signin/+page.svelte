<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const message = $derived(form?.error === "too_many" ? m.signin.tooMany : form?.error === "invalid" ? m.signin.invalid : "");
</script>

<svelte:head><title>{m.signin.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<section class="cx-start" aria-labelledby="t">
  <div>
    <h1 id="t">{m.signin.title}</h1>
    <p class="cx-lede">{m.signin.lede}</p>
  </div>
  <form class="cx-form" method="POST" novalidate>
    <div class="cx-field" class:invalid={message}>
      <label for="key">{m.signin.key}</label>
      <input id="key" name="key" type="password" class="mono-input" autocomplete="current-password" autocapitalize="characters" spellcheck="false" aria-describedby="key-hint{message ? ' key-error' : ''}" required />
      <p class="cx-help" id="key-hint">{m.signin.hint}</p>
      {#if message}<p class="cx-error" id="key-error" role="alert">{message}</p>{/if}
    </div>
    <div class="cx-actions"><button class="cx-btn" type="submit">{m.signin.submit}</button></div>
  </form>
  <p>{m.signin.noSpace} <a href="/start">{m.signin.create}</a></p>
</section>
