<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";

  /**
   * What a participant can do with a receipt code once the ballot is recorded: copy it, save it as a file, and where the
   * poll allows it, ask for it by email. The email goes to the address on the roll for this link; the form carries only the
   * code. On a secret poll that publishes its ballots the form says what the email ties together.
   */
  let { locale, code, title, organization, pollId, emailable, ties, outcome }: {
    locale: Locale; code: string; title: string; organization: string; pollId: string;
    emailable: boolean; ties: boolean; outcome: string | null;
  } = $props();
  const m = $derived(consoleMessages[locale]);
  let enhanced = $state(false);
  let copied = $state(false);
  let sending = $state(false);
  onMount(() => { enhanced = true; });

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 2500);
    } catch { /* the code stays on screen to be selected */ }
  }
  function save(): void {
    const body = fill(m.voter.receiptFile, { title, org: organization, code, link: `${location.origin}/r/${pollId}` });
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${code}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>

<div class="rcpt">
  {#if enhanced}
    <div class="rcpt__row">
      <button type="button" class="rcpt__btn" onclick={copy}>{copied ? m.voter.receiptCopied : m.voter.receiptCopy}</button>
      <button type="button" class="rcpt__btn" onclick={save}>{m.voter.receiptSave}</button>
    </div>
    <p class="rcpt__live" role="status">{copied ? m.voter.receiptCopied : ""}</p>
  {/if}
  {#if emailable}
    {#if outcome === "sent"}
      <p class="rcpt__note" role="status">{m.voter.receiptMailSent}</p>
    {:else}
      <form method="POST" class="rcpt__mail" use:enhance={() => { sending = true; return async ({ update }) => { await update({ reset: false }); sending = false; }; }}>
        <input type="hidden" name="intent" value="receipt" />
        <input type="hidden" name="receipt" value={code} />
        <button type="submit" class="rcpt__btn" disabled={sending}>{m.voter.receiptMail}</button>
        <p class="rcpt__note">{ties ? m.voter.receiptMailSecret : m.voter.receiptMailKept}</p>
      </form>
    {/if}
  {/if}
  {#if outcome && outcome !== "sent"}<p class="rcpt__err" role="alert">{errorText(m, outcome)}</p>{/if}
</div>

<style>
  .rcpt{margin-top:var(--space-3);display:grid;gap:var(--space-3);justify-items:center}
  .rcpt__row{display:flex;flex-wrap:wrap;gap:var(--space-2);justify-content:center}
  .rcpt__btn{min-height:2.75rem;padding:var(--space-2) var(--space-4);border:1.5px solid currentColor;border-radius:var(--radius);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}
  .rcpt__btn:disabled{opacity:.55;cursor:progress}
  .rcpt__live{margin:0;min-height:1.2em;font-size:.85rem;color:var(--ink-2)}
  .rcpt__mail{display:grid;gap:var(--space-2);justify-items:center;max-width:26rem}
  .rcpt__note{margin:0;font-size:.88rem;line-height:1.45;color:var(--ink-2)}
  .rcpt__err{margin:0;font-size:.9rem;font-weight:700;color:var(--danger)}
</style>
