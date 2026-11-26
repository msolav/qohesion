<script lang="ts">
  import { enhance } from "$app/forms";
  import CopyButton from "#lib/components/CopyButton.svelte";
  import { consoleMessages, errorText } from "#lib/i18n/console.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  const fmt = $derived(new Intl.DateTimeFormat(data.locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }));
  const failedIn = (name: string) => (form && "form" in form && form.form === name ? form : null);
  const roleOf = (k: { owner: boolean; administrator: boolean }) => (k.owner && k.administrator ? m.role.both : k.owner ? m.role.owner : m.role.administrator);

  function confirmWith(message: string) {
    return ({ cancel }: { cancel: () => void }) => {
      if (!confirm(message)) cancel();
    };
  }
</script>

<svelte:head><title>{m.space.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<div class="cx-title"><h1>{m.space.title}</h1></div>

<section aria-labelledby="settings-h">
  <h2 id="settings-h">{m.space.settings}</h2>
  <form class="cx-form gap" method="POST" action="?/save" use:enhance>
    {#if form && "saved" in form}<p class="cx-notice" role="status">{m.space.saved}</p>{/if}
    <div class="cx-field" class:invalid={failedIn("save")}>
      <label for="name">{m.space.name}</label>
      <input id="name" name="name" type="text" maxlength="80" value={data.space?.name ?? ""} required />
      {#if failedIn("save")}<p class="cx-error" role="alert">{errorText(m, failedIn("save")?.error)}</p>{/if}
    </div>
    <div class="cx-two">
      <div class="cx-field">
        <label for="language">{m.space.language}</label>
        <select id="language" name="language"><option value="fr" selected={data.space?.locale === "fr"}>Français</option><option value="en" selected={data.space?.locale === "en"}>English</option></select>
      </div>
      <div class="cx-field">
        <label for="theme">{m.space.template}</label>
        <select id="theme" name="theme">
          <option value="ballot-paper" selected={data.space?.theme === "ballot-paper"}>{m.form.templateBallot}</option>
          <option value="seed-packet" selected={data.space?.theme === "seed-packet"}>{m.form.templateSeed}</option>
        </select>
      </div>
    </div>
    <div class="cx-actions"><button class="cx-btn" type="submit">{m.space.save}</button></div>
  </form>
</section>

<section class="cx-section" aria-labelledby="keys-h">
  <h2 id="keys-h">{m.space.keys}</h2>
  <p>{m.space.keysText}</p>

  {#if form && "newKey" in form}
    <div class="cx-card gap" role="status">
      <h3>{m.space.newKeyTitle} · {form.newKeyLabel}</h3>
      <p class="cx-help">{m.space.newKeyText}</p>
      <code class="cx-key gap">{form.newKey}</code>
      <div class="cx-actions gap"><CopyButton text={form.newKey} label={m.common.copy} done={m.common.copied} /></div>
    </div>
  {/if}
  {#if failedIn("revoke")}<p class="cx-notice error gap" role="alert">{errorText(m, failedIn("revoke")?.error)}</p>{/if}

  <div class="cx-wrap gap">
    <table>
      <thead><tr><th scope="col">{m.space.keyLabel}</th><th scope="col">{m.space.keyRoles}</th><th scope="col"></th></tr></thead>
      <tbody>
        {#each data.keys as key (key.id)}
          <tr>
            <td>{key.label}{#if key.id === data.currentKey}&nbsp;<span class="cx-help">({m.space.you})</span>{/if}</td>
            <td>{roleOf(key)}</td>
            <td>
              {#if key.revokedAt}<span class="cx-chip closed">{m.space.revoked}</span>
              {:else}
                <form method="POST" action="?/revoke" use:enhance={confirmWith(m.space.confirmRevoke)}>
                  <input type="hidden" name="key" value={key.id} />
                  <button class="cx-btn danger small" type="submit">{m.space.revoke}</button>
                </form>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <h3 class="gap">{m.space.addKey}</h3>
  <form class="cx-form gap" method="POST" action="?/addKey" use:enhance>
    <div class="cx-field" class:invalid={failedIn("key")}>
      <label for="label">{m.space.keyLabel}</label>
      <input id="label" name="label" type="text" maxlength="60" value={failedIn("key")?.label ?? ""} required />
      {#if failedIn("key")}<p class="cx-error" role="alert">{errorText(m, failedIn("key")?.error)}</p>{/if}
    </div>
    <fieldset class="cx-field">
      <legend class="cx-label">{m.space.keyRoles}</legend>
      <div class="cx-choices cols-2">
        <label class="cx-choice check"><input type="checkbox" name="role" value="administrator" checked /><span><b>{m.role.administrator}</b></span></label>
        <label class="cx-choice check"><input type="checkbox" name="role" value="owner" /><span><b>{m.role.owner}</b></span></label>
      </div>
    </fieldset>
    <div class="cx-actions"><button class="cx-btn ghost" type="submit">{m.space.createKey}</button></div>
  </form>
</section>

<section class="cx-section" aria-labelledby="danger-h">
  <h2 id="danger-h">{m.space.danger}</h2>
  <p>{m.space.dangerText}</p>
  <form class="cx-form gap" method="POST" action="?/deleteSpace" use:enhance={confirmWith(m.space.dangerText)}>
    <div class="cx-field" class:invalid={failedIn("delete")}>
      <label for="confirm">{m.space.confirmName}</label>
      <input id="confirm" name="confirm" type="text" autocomplete="off" />
      {#if failedIn("delete")}<p class="cx-error" role="alert">{errorText(m, failedIn("delete")?.error)}</p>{/if}
    </div>
    <div class="cx-actions"><button class="cx-btn danger" type="submit">{m.space.deleteSpace}</button></div>
  </form>
</section>
