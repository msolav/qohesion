<script lang="ts">
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { guideMessages, TOPIC_IDS, type TopicId } from "#lib/i18n/guide.js";
  import { messages } from "#lib/i18n/messages.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(messages[data.locale]);
  const g = $derived(guideMessages[data.locale]);
  const icons: Readonly<Record<TopicId, string>> = { secret: "shield", named: "users", list: "list", sealed: "lock", "counting-key": "key", receipt: "hash", publication: "globe", approval: "approved" };
</script>

<svelte:head>
  <title>{g.how.title} · {t.brand.name}</title>
  <meta name="description" content={g.how.lede} />
</svelte:head>

<div class="page">
  <article class="guide" aria-labelledby="guide-title">
    <h1 id="guide-title">{g.how.title}</h1>
    <p class="guide__lede">{g.how.lede}</p>

    <nav class="guide__toc" aria-labelledby="toc-title">
      <h2 id="toc-title">{g.how.contents}</h2>
      <ul>
        {#each TOPIC_IDS as id (id)}
          <li><a href="#{id}"><span class="guide__ico" aria-hidden="true"><UiIcon name={icons[id]} size={18} /></span>{g.how.topics[id].title}</a></li>
        {/each}
      </ul>
      <p><a href="/methods?lang={data.locale}">{g.how.methodsLink}</a></p>
    </nav>

    {#each TOPIC_IDS as id (id)}
      {@const topic = g.how.topics[id]}
      <section class="guide__topic" id={id} aria-labelledby="h-{id}">
        <h2 id="h-{id}"><span class="guide__ico" aria-hidden="true"><UiIcon name={icons[id]} size={22} /></span>{topic.title}</h2>
        <p class="guide__summary">{topic.summary}</p>
        {#each topic.body as paragraph, i (i)}<p>{paragraph}</p>{/each}
        <h3>{g.how.stepsTitle}</h3>
        <ol class="guide__steps">{#each topic.steps as step, i (i)}<li>{step}</li>{/each}</ol>
        <h3>{g.how.limitsTitle}</h3>
        <ul class="guide__limits">{#each topic.limits as limit, i (i)}<li>{limit}</li>{/each}</ul>
      </section>
    {/each}
  </article>
</div>
