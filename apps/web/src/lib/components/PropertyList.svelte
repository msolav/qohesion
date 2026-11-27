<script lang="ts">
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { guideMessages } from "#lib/i18n/guide.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { learnHref, type Property } from "#lib/properties.js";
  import "#lib/styles/props.css";

  /**
   * The settings of a poll, one row each: an icon, the name of the setting, the value as a badge, what it means, and a
   * link to the page that explains it. Used on the ballot's rules page and on the builder's review step. In a preview the
   * links are left out, since the preview is inert.
   */
  let { locale, items, links = true }: { locale: Locale; items: readonly Property[]; links?: boolean } = $props();
  const g = $derived(guideMessages[locale]);
</script>

<ul class="props">
  {#each items as p (p.id)}
    <li class="prop" data-tone={p.tone} data-prop={p.id}>
      <span class="prop__icon" aria-hidden="true"><UiIcon name={p.icon} size={22} /></span>
      <div class="prop__body">
        <p class="prop__head">
          <span class="prop__label">{p.label}</span>
        </p>
        <p class="prop__badges">{#each p.badges as badge (badge)}<span class="prop__badge">{badge}</span>{/each}</p>
        {#each p.text as line, i (i)}<p class="prop__text">{line}</p>{/each}
        {#if links && p.learn}
          <a class="prop__more" href={learnHref(locale, p.learn)} target="_blank" rel="noopener">{g.props.learn}<span class="sr-only"> · {p.label} ({g.props.newTab})</span></a>
        {/if}
      </div>
    </li>
  {/each}
</ul>
