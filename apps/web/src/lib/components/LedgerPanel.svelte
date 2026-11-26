<script lang="ts">
  import { enhance } from "$app/forms";
  import { consoleMessages, fill } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import type { LedgerView } from "#lib/server/service.js";

  let {
    locale,
    ledger,
    check,
  }: {
    locale: Locale;
    ledger: LedgerView;
    check: { input: string; found: { position: number; size: number; root: string; valid: boolean } | null } | null;
  } = $props();
  const m = $derived(consoleMessages[locale]);
</script>

<section class="cx-section" aria-labelledby="ledger-h">
  <h2 id="ledger-h">{m.results.ledger}</h2>
  <p>{m.results.ledgerText}</p>
  <dl class="cx-stats cx-stats-2 gap">
    <div class="cx-stat"><dt>{m.results.size}</dt><dd>{ledger.size}</dd></div>
    <div class="cx-stat"><dt>{m.results.root}</dt><dd class="code">{ledger.root.slice(0, 16)}…</dd></div>
  </dl>
  <p class="cx-help gap mono">{ledger.root}</p>

  <form class="cx-form gap" method="POST" action="?/check" use:enhance>
    <div class="cx-field">
      <label for="receipt">{m.results.check}</label>
      <input id="receipt" name="receipt" type="text" class="mono-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" value={check?.input ?? ""} aria-describedby="receipt-help" />
      <p class="cx-help" id="receipt-help">{m.results.checkHelp}</p>
    </div>
    <div class="cx-actions"><button class="cx-btn ghost" type="submit">{m.results.checkSubmit}</button></div>
  </form>
  {#if check}
    <div class="cx-notice gap" class:error={!check.found} role="status">
      {#if check.found}
        <div>
          <b>{m.results.checkFound}</b>
          <p>{fill(m.results.checkPosition, { n: check.found.position + 1, size: check.found.size })}{check.found.valid ? ` · ${m.results.checkProof}` : ""}</p>
        </div>
      {:else}
        <p>{m.results.checkNotFound}</p>
      {/if}
    </div>
  {/if}

  <h3 class="gap">{m.results.receipts}</h3>
  <ul class="cx-receipts gap">
    {#each ledger.receipts as code (code)}<li>{code}</li>{/each}
  </ul>
</section>
