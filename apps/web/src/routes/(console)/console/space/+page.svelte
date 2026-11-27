<script lang="ts">
  import { enhance } from "$app/forms";
  import ConfirmAction from "#lib/components/ConfirmAction.svelte";
  import CopyButton from "#lib/components/CopyButton.svelte";
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { consoleMessages, errorText } from "#lib/i18n/console.js";
  import { THEMES, THEME_NAMES } from "#lib/theme.js";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
  const m = $derived(consoleMessages[data.locale]);
  // The name being edited is kept in state, so that a change of language does not bring back the saved one.
  const savedName = (() => data.space?.name ?? "")();
  let name = $state(savedName);
  let keyLabel = $state("");
  const fmt = $derived(new Intl.DateTimeFormat(data.locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium" }));
  $effect(() => {
    if (form && "newKey" in form) keyLabel = "";
  });
  const failedIn = (name: string) => (form && "form" in form && form.form === name ? form : null);
  const roleOf = (k: { owner: boolean; administrator: boolean }) => (k.owner && k.administrator ? m.role.both : k.owner ? m.role.owner : m.role.administrator);
</script>

<svelte:head><title>{m.space.title} · Qohesion</title><meta name="robots" content="noindex" /></svelte:head>

<div class="cx-title"><h1>{m.space.title}</h1></div>

<section aria-labelledby="settings-h">
  <h2 id="settings-h">{m.space.settings}</h2>
  <form class="cx-form gap" method="POST" action="?/save" use:enhance>
    {#if form && "saved" in form}<p class="cx-notice" role="status">{m.space.saved}</p>{/if}
    <div class="cx-field" class:invalid={failedIn("save")}>
      <label for="name">{m.space.name}</label>
      <input id="name" name="name" type="text" maxlength="80" bind:value={name} readonly={data.nameLocked} aria-describedby={data.nameLocked ? "name-locked" : undefined} required />
      {#if data.nameLocked}<p class="cx-help" id="name-locked">{m.space.nameLocked}</p>{/if}
      {#if failedIn("save")}<p class="cx-error" role="alert">{errorText(m, failedIn("save")?.error)}</p>{/if}
    </div>
    <div class="cx-two">
      <div class="cx-field">
        <label for="language">{m.space.language}</label>
        <select id="language" name="language"><option value="fr" selected={data.space?.locale === "fr"}>Français</option><option value="en" selected={data.space?.locale === "en"}>English</option></select>
      </div>
      <div class="cx-field">
        <label for="timeZone">{m.space.timeZone}</label>
        <select id="timeZone" name="timeZone">
          {#each data.timeZones as zone (zone)}<option value={zone} selected={data.space?.timeZone === zone}>{zone.replace("_", " ")}</option>{/each}
        </select>
      </div>
      <div class="cx-field">
        <label for="theme">{m.space.template}</label>
        <select id="theme" name="theme">
          {#each THEMES as value (value)}<option {value} selected={data.space?.theme === value}>{THEME_NAMES[value][data.locale]}</option>{/each}
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
                <form id="f-revoke-{key.id}" method="POST" action="?/revoke" use:enhance><input type="hidden" name="key" value={key.id} /></form>
                <ConfirmAction formId="f-revoke-{key.id}" label={m.space.revoke} title={m.space.revoke} message={m.space.confirmRevoke} backLabel={m.common.back} kind="danger" small />
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
      <input id="label" name="label" type="text" maxlength="60" bind:value={keyLabel} required />
      {#if failedIn("key")}<p class="cx-error" role="alert">{errorText(m, failedIn("key")?.error)}</p>{/if}
    </div>
    <fieldset class="cx-field">
      <legend class="cx-label">{m.space.keyRoles}</legend>
      <div class="cx-choices cols-2">
        <label class="cx-choice check has-ico"><input type="checkbox" name="role" value="administrator" checked /><span><i class="ico"><UiIcon name="shield" /></i><b>{m.role.administrator}</b></span></label>
        <label class="cx-choice check has-ico"><input type="checkbox" name="role" value="owner" /><span><i class="ico"><UiIcon name="key" /></i><b>{m.role.owner}</b></span></label>
      </div>
    </fieldset>
    <div class="cx-actions"><button class="cx-btn ghost" type="submit">{m.space.createKey}</button></div>
  </form>
</section>

<section class="cx-section" aria-labelledby="danger-h">
  <h2 id="danger-h">{m.space.danger}</h2>
  <p>{m.space.dangerText}</p>
  <form id="f-delete" class="cx-form gap" method="POST" action="?/deleteSpace" use:enhance>
    <div class="cx-field" class:invalid={failedIn("delete")}>
      <label for="confirm">{m.space.confirmName}</label>
      <input id="confirm" name="confirm" type="text" autocomplete="off" />
      {#if failedIn("delete")}<p class="cx-error" role="alert">{errorText(m, failedIn("delete")?.error)}</p>{/if}
    </div>
  </form>
  <div class="cx-actions gap"><ConfirmAction formId="f-delete" label={m.space.deleteSpace} message={m.space.dangerText} backLabel={m.common.back} kind="danger" /></div>
</section>
