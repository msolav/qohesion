<script lang="ts">
  import { consoleMessages, errorText } from "#lib/i18n/console.js";
  import CopyButton from "#lib/components/CopyButton.svelte";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const created = $derived(form?.created === true ? form : null);
  const failed = $derived(form?.error ? form : null);
  const download = $derived(created ? `data:text/plain;charset=utf-8,${encodeURIComponent(`${created.name}\n${created.key}\n`)}` : "");
</script>

<svelte:head><title>{created ? m.start.keyTitle : m.start.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

{#if created}
  <section class="cx-start" aria-labelledby="t">
    <div>
      <h1 id="t">{m.start.keyTitle}</h1>
      <p class="cx-lede">{m.start.keyText}</p>
    </div>
    <div>
      <p class="cx-help" id="key-label">{m.start.keyLabel}</p>
      <code class="cx-key" aria-labelledby="key-label">{created.key}</code>
    </div>
    <p class="cx-notice warn" role="note">{m.start.keyWarning}</p>
    <div class="cx-actions">
      <CopyButton text={created.key} label={m.common.copy} done={m.common.copied} />
      <a class="cx-btn ghost" href={download} download="qohesion-key.txt">{m.start.download}</a>
    </div>
    <p><a class="cx-btn" href="/console">{m.start.keyContinue}</a></p>
  </section>
{:else}
  <section class="cx-start" aria-labelledby="t">
    <div>
      <h1 id="t">{m.start.title}</h1>
      <p class="cx-lede">{m.start.lede}</p>
    </div>
    <form class="cx-form" method="POST" novalidate>
      <div class="cx-field" class:invalid={failed}>
        <label for="name">{m.start.name}</label>
        <input id="name" name="name" type="text" maxlength="80" autocomplete="organization" value={failed?.name ?? ""} aria-describedby={failed ? "name-error" : undefined} required />
        {#if failed}<p class="cx-error" id="name-error" role="alert">{errorText(m, failed.error)}</p>{/if}
      </div>
      <div class="cx-actions"><button class="cx-btn" type="submit">{m.start.submit}</button></div>
    </form>
    <p><a href="/signin">{m.start.haveKey}</a></p>
  </section>
{/if}
