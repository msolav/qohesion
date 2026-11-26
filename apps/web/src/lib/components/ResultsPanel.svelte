<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { consoleMessages, fill } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { OPTION_GLYPHS, optionLabel } from "#lib/option-labels.js";
  import type { PollStatus, ResultsAudience, ResultsTiming } from "#lib/results-rules.js";
  import type { ResultsView } from "#lib/server/service.js";

  let {
    locale,
    pollId,
    options,
    timing,
    audience,
    initial,
    token = null,
  }: {
    locale: Locale;
    pollId: string;
    options: readonly { id: string; label: string | null }[];
    timing: ResultsTiming;
    audience: ResultsAudience;
    initial: ResultsView;
    token?: string | null;
  } = $props();

  const m = $derived(consoleMessages[locale]);
  // The panel starts from what the server rendered and then follows the address that applies the same rules.
  const start = (() => initial)();
  let view = $state<ResultsView>(start);
  let updatedAt = $state(new Date());
  let busy = $state(false);

  const status = $derived<PollStatus>(view.status);
  const total = $derived(view.counts ? Object.values(view.counts).reduce((a, b) => a + b, 0) : 0);
  const best = $derived(view.counts ? Math.max(0, ...Object.values(view.counts)) : 0);
  const leaders = $derived(view.counts ? Object.entries(view.counts).filter(([, n]) => n === best && best > 0).length : 0);
  const blocked = $derived<"timing" | "audience" | null>(view.access.totals ? null : status === "open" && timing === "close" ? "timing" : "audience");
  const clock = $derived(new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { timeStyle: "medium" }).format(updatedAt));

  async function refresh(): Promise<void> {
    busy = true;
    try {
      const response = await fetch(`/api/results/${pollId}${token ? `?t=${encodeURIComponent(token)}` : ""}`, { headers: { accept: "application/json" } });
      if (response.ok) {
        const next = (await response.json()) as ResultsView;
        const closedNow = view.status === "open" && next.status === "closed";
        view = next;
        updatedAt = new Date();
        // The ledger and the final wording come with the page, so it is loaded again once the poll has closed.
        if (closedNow) await invalidateAll();
      }
    } catch {
      // A failed request leaves the last numbers on screen; the next tick tries again.
    } finally {
      busy = false;
    }
  }

  $effect(() => {
    if (status !== "open") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });

  const percent = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
</script>

<section aria-labelledby="results-title">
  <div class="cx-title">
    <h2 id="results-title">{status === "closed" ? m.results.finalTitle : m.results.title}</h2>
    {#if status === "open" && (view.access.totals || view.access.turnout)}
      <p class="cx-live" role="status"><span>{m.results.live}</span> <span class="cx-help">{busy ? m.results.updating : `${m.results.updated} ${clock}`}</span></p>
    {/if}
  </div>

  {#if view.access.turnout && view.turnout !== null}
    <dl class="cx-stats cx-stats-2">
      <div class="cx-stat"><dt>{m.results.turnout}</dt><dd>{view.turnout}{#if view.rollCount}<small> {m.results.of} {view.rollCount}</small>{/if}</dd></div>
    </dl>
  {/if}

  {#if view.counts}
    {#if total === 0}
      <p class="cx-notice gap">{m.results.noBallots}</p>
    {:else}
      <ul class="cx-bars gap" aria-label={m.results.share}>
        {#each options as option (option.id)}
          {@const n = view.counts[option.id] ?? 0}
          {@const glyph = OPTION_GLYPHS[option.id]}
          <li class="cx-bar {option.id}" class:lead={n === best && best > 0 && leaders === 1}>
            <div class="row">
              {#if glyph}
                <span class="glyph" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14"><path d={glyph} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
              {/if}
              <span class="name">{optionLabel(locale, option)}</span>
              <span class="count">{n}</span>
              <span class="pct">{percent(n)} %</span>
            </div>
            <div class="track" aria-hidden="true"><span class="fill w{percent(n)}"></span></div>
          </li>
        {/each}
      </ul>
      <p class="cx-help gap">{m.results.total}: {total}{#if leaders > 1} · {m.results.tie}{/if}</p>
    {/if}
  {:else if blocked === "timing"}
    <div class="cx-notice gap"><div><b>{m.results.hiddenTitle}</b><p>{view.access.turnout ? m.results.hiddenAdminText : m.results.hiddenText}</p></div></div>
  {:else}
    <div class="cx-notice warn gap"><div><b>{m.results.notAllowedTitle}</b><p>{m.results.notAllowedText}</p></div></div>
  {/if}
  <p class="cx-help gap">{m.resultsStatement[timing][audience]}</p>
</section>
