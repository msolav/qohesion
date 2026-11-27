<script lang="ts">
  import { consoleMessages } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const message = $derived(form?.error === "too_many" ? m.signin.tooMany : form?.error === "invalid" ? m.gate.invalid : "");
</script>

<svelte:head><title>{m.gate.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<section class="cx-start" aria-labelledby="t">
  <div>
    <h1 id="t">{m.gate.title}</h1>
    <p class="cx-lede">{m.gate.lede}</p>
  </div>
  <form class="cx-form" method="POST" novalidate>
    <input type="hidden" name="next" value={data.next} />
    <div class="cx-field" class:invalid={message}>
      <label for="password">{m.gate.label}</label>
      <input id="password" name="password" type="password" autocomplete="current-password" aria-describedby={message ? "password-error" : undefined} required />
      {#if message}<p class="cx-error" id="password-error" role="alert">{message}</p>{/if}
    </div>
    <div class="cx-actions"><button class="cx-btn" type="submit">{m.gate.submit}</button></div>
  </form>
</section>
