<script lang="ts">
  import { tick } from "svelte";
  import BallotView from "#lib/components/BallotView.svelte";
  import { consoleMessages, errorText, fill } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { COLOR_IDS, ICON_IDS, ICONS, COLORS, colorName, iconName } from "#lib/option-style.js";
  import { AUDIENCES, TIMINGS, type ResultsAudience, type ResultsTiming } from "#lib/results-rules.js";
  import type { PollInput } from "#lib/server/service.js";
  import { THEMES, THEME_NAMES, type Theme } from "#lib/theme.js";

  let {
    locale,
    submit,
    initial,
    error,
    defaultTheme,
  }: { locale: Locale; submit: string; initial: PollInput | null; error: string | null; defaultTheme: Theme } = $props();

  const m = $derived(consoleMessages[locale]);
  const start = (() => initial)();

  interface Row {
    key: number;
    label: string;
    icon: string;
    color: string;
    open: boolean;
  }
  let nextKey = 0;
  const row = (label = "", icon = "", color = ""): Row => ({ key: nextKey++, label, icon, color, open: false });

  // Everything typed or chosen lives in state, so it survives a change of language and any refresh of the page.
  let step = $state(0);
  let title = $state(start?.title ?? "");
  let description = $state(start?.description ?? "");
  let kind = $state<"yes-no" | "choice">(start?.kind ?? "yes-no");
  let rows = $state<Row[]>(start && start.options.length > 0 ? start.options.map((o) => row(o.label, o.icon ?? "", o.color ?? "")) : [row(), row(), row()]);
  let timing = $state<ResultsTiming>(start?.timing ?? "close");
  let audience = $state<ResultsAudience>(start?.audience ?? "voters");
  let encryption = $state<"sealed" | "none">(start ? (start.encrypted ? "sealed" : "none") : "sealed");
  let byHours = $state(start?.closeAfterHours != null);
  let hours = $state(String(start?.closeAfterHours ?? 72));
  let theme = $state<Theme>(start?.theme ?? (() => defaultTheme)());
  let enhanced = $state(false);
  let problem = $state<string | null>(null);
  let announce = $state("");
  let armed = $state<number | null>(null);
  let dragFrom = $state<number | null>(null);

  const STEPS = ["question", "choices", "results", "closing", "review"] as const;
  const last = STEPS.length - 1;

  $effect(() => {
    enhanced = true;
  });
  // Live totals need readable ballots, so choosing them turns encryption off.
  $effect(() => {
    if (timing === "live") encryption = "none";
  });
  // A refusal from the server sends the person to the step that holds the problem.
  $effect(() => {
    if (!error) return;
    step = error.startsWith("title") || error === "description_too_long" ? 0 : error.startsWith("option") ? 1 : error === "invalid_duration" ? 3 : 2;
  });

  const labels = $derived(rows.map((r) => r.label.trim()).filter((l) => l.length > 0));
  const preview = $derived({
    title,
    description,
    options:
      kind === "choice"
        ? rows.map((r) => ({ id: `p${r.key}`, label: r.label.trim() || null, icon: r.icon || null, color: r.color || null }))
        : [{ id: "for", label: null }, { id: "against", label: null }, { id: "abstain", label: null }],
    timing,
    audience,
    encrypted: encryption === "sealed",
    closesAt: null,
    rollCount: null,
    rollCode: null,
  });
  const serverError = $derived(error ? errorText(m, error) : "");

  function go(to: number): void {
    problem = null;
    step = Math.max(0, Math.min(last, to));
    void tick().then(() => document.getElementById(`step-${step}`)?.querySelector<HTMLElement>("[data-first]")?.focus());
  }

  /** Whether the step can be left. A step with a missing answer says what is missing and keeps the person on it. */
  function check(at: number): boolean {
    if (at === 0 && title.trim() === "") {
      problem = m.build.needTitle;
      document.getElementById("title")?.focus();
      return false;
    }
    if (at === 1 && kind === "choice") {
      const lower = labels.map((l) => l.toLowerCase());
      if (labels.length < 2 || new Set(lower).size !== lower.length) {
        problem = labels.length < 2 ? m.build.needOptions : m.errors["options_duplicate"] ?? "";
        return false;
      }
    }
    return true;
  }
  function next(): void {
    if (check(step)) go(step + 1);
  }
  function jump(to: number): void {
    // Going back is always allowed. Going forward passes through every step in between.
    if (to <= step) return go(to);
    for (let at = step; at < to; at++) {
      if (!check(at)) return go(at);
    }
    go(to);
  }

  async function focusOption(key: number): Promise<void> {
    await tick();
    document.getElementById(`option-${key}`)?.focus();
  }
  function addAfter(i: number): void {
    if (rows.length >= 12) return;
    const added = row();
    rows.splice(i + 1, 0, added);
    void focusOption(added.key);
  }
  function remove(i: number): void {
    if (rows.length <= 2) return;
    const focusKey = rows[i - 1]?.key ?? rows[i + 1]?.key;
    rows.splice(i, 1);
    if (focusKey !== undefined) void focusOption(focusKey);
  }
  function move(from: number, to: number): void {
    if (to < 0 || to >= rows.length || from === to) return;
    const [item] = rows.splice(from, 1);
    if (!item) return;
    rows.splice(to, 0, item);
    announce = fill(m.build.moved, { n: to + 1 });
    void focusOption(item.key);
  }
  function onOptionKey(event: KeyboardEvent, i: number): void {
    const target = event.currentTarget as HTMLInputElement;
    if (event.key === "Enter") {
      event.preventDefault();
      if (target.value.trim() === "" && i === rows.length - 1) next();
      else addAfter(i);
    } else if (event.key === "Backspace" && target.value === "" && rows.length > 2) {
      event.preventDefault();
      remove(i);
    } else if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      move(i, i - 1);
    } else if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      move(i, i + 1);
    }
  }
  function onTitleKey(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      next();
    }
  }

  const stepLabel = (id: (typeof STEPS)[number]) => m.build.stepNames[id];
</script>

<form class="bld" method="POST" novalidate>
  <div class="bld-main">
    <nav class="bld-steps" aria-label={m.build.stepsLabel}>
      <p class="bld-count" aria-live="polite">{fill(m.build.step, { n: step + 1, total: STEPS.length })}</p>
      <ol>
        {#each STEPS as id, i (id)}
          <li>
            <button type="button" class="bld-step-btn" class:done={i < step} aria-label={stepLabel(id)} aria-current={i === step ? "step" : undefined} onclick={() => jump(i)}>
              <span class="n" aria-hidden="true">{#if i < step}<svg viewBox="0 0 16 16" width="12" height="12"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>{:else}{i + 1}{/if}</span>
              <span class="t">{stepLabel(id)}</span>
            </button>
          </li>
        {/each}
      </ol>
    </nav>

    {#if serverError}<p class="cx-notice error" role="alert">{serverError}</p>{/if}

    <!-- 1. Question -->
    <section class="bld-step" id="step-0" hidden={enhanced && step !== 0} aria-labelledby="h-0">
      <h2 id="h-0">{stepLabel("question")}</h2>
      <div class="cx-field" class:invalid={problem && step === 0}>
        <label for="title">{m.form.question}</label>
        <input id="title" name="title" type="text" class="big" maxlength="140" data-first bind:value={title} onkeydown={onTitleKey} autocomplete="off" aria-describedby="title-help{problem && step === 0 ? ' step-problem' : ''}" required />
        <p class="cx-help" id="title-help">{m.form.questionHelp}</p>
      </div>
      <div class="cx-field">
        <label for="description">{m.form.details} <span class="cx-help">({m.common.optional})</span></label>
        <textarea id="description" name="description" maxlength="2000" aria-describedby="description-help" bind:value={description}></textarea>
        <p class="cx-help" id="description-help">{m.form.detailsHelp}</p>
      </div>
      {#if problem && step === 0}<p class="cx-error" id="step-problem" role="alert">{problem}</p>{/if}
    </section>

    <!-- 2. Choices -->
    <section class="bld-step" id="step-1" hidden={enhanced && step !== 1} aria-labelledby="h-1">
      <h2 id="h-1">{stepLabel("choices")}</h2>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.kind}</legend>
        <div class="cx-choices cols-2">
          <label class="cx-choice"><input type="radio" name="kind" value="yes-no" bind:group={kind} data-first /><span><b>{m.form.kindYesNo}</b><small>{m.form.kindYesNoText}</small></span></label>
          <label class="cx-choice"><input type="radio" name="kind" value="choice" bind:group={kind} /><span><b>{m.form.kindChoice}</b><small>{m.form.kindChoiceText}</small></span></label>
        </div>
      </fieldset>

      {#if kind === "choice"}
        <fieldset class="cx-field" class:invalid={problem && step === 1}>
          <legend class="cx-label">{m.form.options}</legend>
          <p class="cx-help">{m.form.optionsHelp} <span class="bld-keys">{m.build.optionsKeys}</span></p>
          <ul class="bld-options">
            {#each rows as r, i (r.key)}
              <li class="bld-option" class:dragging={dragFrom === i} draggable={armed === i} ondragstart={(e) => { dragFrom = i; if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); } }} ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); }} ondragend={() => { armed = null; dragFrom = null; }}>
                <div class="bld-row">
                  <button type="button" class="bld-handle" aria-label={fill(m.build.drag, { n: i + 1 })} onpointerdown={() => (armed = i)} onkeydown={(e) => { if (e.key === "ArrowUp") { e.preventDefault(); move(i, i - 1); } else if (e.key === "ArrowDown") { e.preventDefault(); move(i, i + 1); } }}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M5.5 3.5h.01M10.5 3.5h.01M5.5 8h.01M10.5 8h.01M5.5 12.5h.01M10.5 12.5h.01" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
                  </button>
                  <button type="button" class="bld-swatch" data-color={r.color || undefined} aria-expanded={r.open} aria-controls="style-{r.key}" aria-label={fill(m.build.styleOpen, { n: i + 1 })} onclick={() => (r.open = !r.open)}>
                    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d={r.icon ? ICONS[r.icon]?.d : ICONS["check"]?.d} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity={r.icon ? 1 : 0.35} /></svg>
                  </button>
                  <label class="sr-only" for="option-{r.key}">{fill(m.form.optionN, { n: i + 1 })}</label>
                  <input id="option-{r.key}" name="option" type="text" maxlength="120" placeholder={fill(m.form.optionN, { n: i + 1 })} bind:value={r.label} onkeydown={(e) => onOptionKey(e, i)} autocomplete="off" data-first={i === 0 ? "" : undefined} />
                  <div class="bld-row-tools">
                    <button type="button" class="bld-tool" aria-label={fill(m.build.moveUp, { n: i + 1 })} disabled={i === 0} onclick={() => move(i, i - 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                    <button type="button" class="bld-tool" aria-label={fill(m.build.moveDown, { n: i + 1 })} disabled={i === rows.length - 1} onclick={() => move(i, i + 1)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                    <button type="button" class="bld-tool" aria-label={fill(m.build.removeOption, { n: i + 1 })} disabled={rows.length <= 2} onclick={() => remove(i)}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" /></svg></button>
                  </div>
                </div>
                <input type="hidden" name="option_icon" value={r.icon} />
                <input type="hidden" name="option_color" value={r.color} />
                {#if r.open}
                  <div class="bld-style" id="style-{r.key}" role="group" aria-label={m.build.styleTitle}>
                    <fieldset>
                      <legend>{m.build.iconLabel}</legend>
                      <div class="bld-icons">
                        <label class="bld-pick"><input type="radio" name="icon-{r.key}" value="" bind:group={r.icon} /><span class="none">{m.build.styleDefault}</span></label>
                        {#each ICON_IDS as id (id)}
                          <label class="bld-pick"><input type="radio" name="icon-{r.key}" value={id} bind:group={r.icon} /><span title={iconName(id, locale)}><svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d={ICONS[id]?.d} fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg><span class="sr-only">{iconName(id, locale)}</span></span></label>
                        {/each}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>{m.build.colorLabel}</legend>
                      <div class="bld-colors">
                        <label class="bld-pick"><input type="radio" name="color-{r.key}" value="" bind:group={r.color} /><span class="none">{m.build.styleDefault}</span></label>
                        {#each COLOR_IDS as id (id)}
                          <label class="bld-pick"><input type="radio" name="color-{r.key}" value={id} bind:group={r.color} /><span class="dot" data-color={id} title={colorName(id, locale)}><span class="sr-only">{colorName(id, locale)}</span></span></label>
                        {/each}
                      </div>
                    </fieldset>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
          <p class="sr-only" aria-live="polite">{announce}</p>
          {#if problem && step === 1}<p class="cx-error" role="alert">{problem}</p>{/if}
          {#if rows.length < 12}<div><button type="button" class="cx-btn ghost small" onclick={() => addAfter(rows.length - 1)}>{m.form.addOption}</button></div>{/if}
        </fieldset>
      {:else}
        <p class="cx-help">{m.build.fixedOptions}</p>
      {/if}
    </section>

    <!-- 3. Results -->
    <section class="bld-step" id="step-2" hidden={enhanced && step !== 2} aria-labelledby="h-2">
      <h2 id="h-2">{stepLabel("results")}</h2>
      <p class="cx-help">{m.form.resultsHelp}</p>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.timing}</legend>
        <div class="cx-choices cols-2">
          {#each TIMINGS as value, i (value)}
            <label class="cx-choice"><input type="radio" name="timing" {value} bind:group={timing} data-first={i === 0 ? "" : undefined} /><span><b>{m.form.timingNames.title[value]}</b><small>{m.form.timingNames.text[value]}</small></span></label>
          {/each}
        </div>
      </fieldset>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.audience}</legend>
        <div class="cx-choices cols-3">
          {#each AUDIENCES as value (value)}
            <label class="cx-choice"><input type="radio" name="audience" {value} bind:group={audience} /><span><b>{m.form.audienceNames.title[value]}</b><small>{m.form.audienceNames.text[value]}</small></span></label>
          {/each}
        </div>
      </fieldset>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.seal.title}</legend>
        <p class="cx-help">{m.seal.help}</p>
        <div class="cx-choices cols-2">
          <label class="cx-choice"><input type="radio" name="encryption" value="sealed" bind:group={encryption} disabled={timing === "live"} /><span><b>{m.seal.sealed.title}</b><small>{m.seal.sealed.text}</small></span></label>
          <label class="cx-choice"><input type="radio" name="encryption" value="none" bind:group={encryption} /><span><b>{m.seal.none.title}</b><small>{m.seal.none.text}</small></span></label>
        </div>
        {#if timing === "live"}<p class="cx-help" role="status">{m.seal.liveNote}</p>{/if}
      </fieldset>
    </section>

    <!-- 4. Closing and look -->
    <section class="bld-step" id="step-3" hidden={enhanced && step !== 3} aria-labelledby="h-3">
      <h2 id="h-3">{stepLabel("closing")}</h2>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.form.duration}</legend>
        <div class="cx-choices cols-2">
          <label class="cx-choice"><input type="radio" name="duration" value="manual" checked={!byHours} onchange={() => (byHours = false)} data-first /><span><b>{m.form.durationManual}</b></span></label>
          <label class="cx-choice"><input type="radio" name="duration" value="hours" checked={byHours} onchange={() => (byHours = true)} /><span><b>{m.form.durationHours}</b></span></label>
        </div>
        {#if byHours}
          <div class="cx-field">
            <label for="hours">{m.form.durationHelp}</label>
            <input id="hours" name="hours" type="number" min="1" max="720" step="1" inputmode="numeric" bind:value={hours} />
          </div>
        {/if}
      </fieldset>
      <fieldset class="cx-field">
        <legend class="cx-label">{m.build.lookTitle}</legend>
        <div class="cx-choices cols-3">
          {#each THEMES as value (value)}
            <label class="cx-choice"><input type="radio" name="theme" {value} bind:group={theme} /><span><b>{THEME_NAMES[value][locale]}</b></span></label>
          {/each}
        </div>
      </fieldset>
    </section>

    <!-- 5. Review -->
    <section class="bld-step" id="step-4" hidden={enhanced && step !== 4} aria-labelledby="h-4">
      <h2 id="h-4">{stepLabel("review")}</h2>
      <p class="cx-help">{m.build.reviewLead}</p>
      <dl class="bld-review">
        <div><dt>{m.form.question}</dt><dd>{title || "–"}</dd><dd><button type="button" class="cx-link" onclick={() => go(0)}>{m.build.change}</button></dd></div>
        <div><dt>{m.form.options}</dt><dd>{kind === "choice" ? labels.join(" · ") || "–" : m.form.kindYesNo}</dd><dd><button type="button" class="cx-link" onclick={() => go(1)}>{m.build.change}</button></dd></div>
        <div><dt>{m.form.results}</dt><dd>{m.resultsStatement[timing][audience]}<br />{encryption === "sealed" ? m.seal.sealed.title : m.seal.none.title}</dd><dd><button type="button" class="cx-link" onclick={() => go(2)}>{m.build.change}</button></dd></div>
        <div><dt>{m.build.stepNames.closing}</dt><dd>{byHours ? `${hours} h` : m.form.durationManual} · {THEME_NAMES[theme][locale]}</dd><dd><button type="button" class="cx-link" onclick={() => go(3)}>{m.build.change}</button></dd></div>
      </dl>
    </section>

    <div class="bld-nav">
      {#if enhanced && step > 0}<button type="button" class="cx-btn ghost" onclick={() => go(step - 1)}>{m.build.back}</button>{/if}
      {#if enhanced && step < last}
        <button type="button" class="cx-btn" onclick={next}>{m.build.next}</button>
      {:else}
        <button class="cx-btn" type="submit">{submit}</button>
      {/if}
    </div>
  </div>

  <aside class="bld-preview" aria-labelledby="preview-h">
    <h2 id="preview-h">{m.build.previewTitle}</h2>
    <p class="cx-help">{m.build.previewNote}</p>
    <div class="bld-phone">
      <div class="preview-surface" data-theme={theme} inert>
        <div class="voter"><div class="ballot"><BallotView {locale} poll={preview} preview /></div></div>
      </div>
    </div>
  </aside>
</form>
