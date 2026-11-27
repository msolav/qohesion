<script lang="ts">
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { guideMessages } from "#lib/i18n/guide.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { METHODS, type MethodFamily } from "#lib/methods.js";

  /** The voting methods, by family, with the state of each. A page (/methods) and the content of the builder's pop-up. */
  let { locale, idPrefix = "", go }: { locale: Locale; idPrefix?: string; go?: (page: "how" | "methods", anchor?: string) => void } = $props();
  const g = $derived(guideMessages[locale]);
  const families: readonly MethodFamily[] = ["decision", "seats", "opinion"];
</script>

<article class="guide" aria-labelledby="{idPrefix}guide-title">
  <h1 id="{idPrefix}guide-title">{g.methods.title}</h1>
  <p class="guide__lede">{g.methods.lede}</p>
  <p class="guide__note">{g.methods.note}</p>

  <nav class="guide__toc" aria-labelledby="{idPrefix}toc-title">
    <h2 id="{idPrefix}toc-title">{g.methods.contents}</h2>
    {#each families as family (family)}
      <h3>{g.methods.families[family].title}</h3>
      <ul>
        {#each METHODS.filter((x) => x.family === family) as method (method.id)}
          <li><a href="#{idPrefix}{method.id}"><span class="guide__ico" aria-hidden="true"><UiIcon name={method.icon} size={18} /></span>{g.methods.list[method.id].name}<span class="guide__state" data-state={method.state}>{method.state === "built" ? g.methods.built : g.methods.planned}</span></a></li>
        {/each}
      </ul>
    {/each}
    <p><a href="/how?lang={locale}" onclick={go ? (e) => { e.preventDefault(); go("how"); } : undefined}>{g.methods.howLink}</a></p>
  </nav>

  {#each families as family (family)}
    <section class="guide__family" aria-labelledby="{idPrefix}f-{family}">
      <h2 id="{idPrefix}f-{family}">{g.methods.families[family].title}</h2>
      <p class="guide__summary">{g.methods.families[family].text}</p>
      {#each METHODS.filter((x) => x.family === family) as method (method.id)}
        {@const text = g.methods.list[method.id]}
        <section class="guide__topic" id="{idPrefix}{method.id}" aria-labelledby="{idPrefix}h-{method.id}">
          <h3 id="{idPrefix}h-{method.id}" class="guide__method"><span class="guide__ico" aria-hidden="true"><UiIcon name={method.icon} size={22} /></span>{text.name}<span class="guide__state" data-state={method.state}>{method.state === "built" ? g.methods.built : g.methods.planned}</span></h3>
          <p class="guide__summary">{text.summary}</p>
          <h4>{g.methods.howTitle}</h4>
          <ol class="guide__steps">{#each text.how as step, i (i)}<li>{step}</li>{/each}</ol>
          <h4>{g.methods.limitsTitle}</h4>
          <ul class="guide__limits">{#each text.limits as limit, i (i)}<li>{limit}</li>{/each}</ul>
        </section>
      {/each}
    </section>
  {/each}
</article>
