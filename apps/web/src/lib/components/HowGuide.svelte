<script lang="ts">
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { guideMessages, TOPIC_IDS, type TopicId } from "#lib/i18n/guide.js";
  import type { Locale } from "#lib/i18n/negotiate.js";

  /**
   * The safeguards of a poll, one topic each. Shown as a page (/how) and inside the pop-up that the builder opens. In the
   * pop-up, `idPrefix` keeps the anchors apart from those of the screen behind, and `go` switches to the other guide.
   */
  let { locale, idPrefix = "", go }: { locale: Locale; idPrefix?: string; go?: (page: "how" | "methods", anchor?: string) => void } = $props();
  const g = $derived(guideMessages[locale]);
  const icons: Readonly<Record<TopicId, string>> = { secret: "shield", named: "users", list: "list", sealed: "lock", "counting-key": "key", receipt: "hash", publication: "globe", approval: "approved" };
</script>

<article class="guide" aria-labelledby="{idPrefix}guide-title">
  <h1 id="{idPrefix}guide-title">{g.how.title}</h1>
  <p class="guide__lede">{g.how.lede}</p>

  <nav class="guide__toc" aria-labelledby="{idPrefix}toc-title">
    <h2 id="{idPrefix}toc-title">{g.how.contents}</h2>
    <ul>
      {#each TOPIC_IDS as id (id)}
        <li><a href="#{idPrefix}{id}"><span class="guide__ico" aria-hidden="true"><UiIcon name={icons[id]} size={18} /></span>{g.how.topics[id].title}</a></li>
      {/each}
    </ul>
    <p><a href="/methods?lang={locale}" onclick={go ? (e) => { e.preventDefault(); go("methods"); } : undefined}>{g.how.methodsLink}</a></p>
  </nav>

  {#each TOPIC_IDS as id (id)}
    {@const topic = g.how.topics[id]}
    <section class="guide__topic" id="{idPrefix}{id}" aria-labelledby="{idPrefix}h-{id}">
      <h2 id="{idPrefix}h-{id}"><span class="guide__ico" aria-hidden="true"><UiIcon name={icons[id]} size={22} /></span>{topic.title}</h2>
      <p class="guide__summary">{topic.summary}</p>
      {#each topic.body as paragraph, i (i)}<p>{paragraph}</p>{/each}
      <h3>{g.how.stepsTitle}</h3>
      <ol class="guide__steps">{#each topic.steps as step, i (i)}<li>{step}</li>{/each}</ol>
      <h3>{g.how.limitsTitle}</h3>
      <ul class="guide__limits">{#each topic.limits as limit, i (i)}<li>{limit}</li>{/each}</ul>
    </section>
  {/each}
</article>
