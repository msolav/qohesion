<script lang="ts">
  import { messages } from "#lib/i18n/messages.js";
  import type { Segment } from "#lib/changelog.js";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  const t = $derived(messages[data.locale]);
</script>

<!-- One line on purpose: whitespace between segments would show as spaces around code and links. -->
{#snippet segments(list: readonly Segment[])}{#each list as part, i (i)}{#if part.type === "code"}<code>{part.text}</code>{:else if part.type === "link"}<a href={part.href}>{part.text}</a>{:else}{part.text}{/if}{/each}{/snippet}

<svelte:head>
  <title>{t.changelog.title} · {t.brand.name}</title>
  <meta name="description" content={t.changelog.note} />
</svelte:head>

<div class="page">
  <article class="log" aria-labelledby="log-title">
    <h1 id="log-title">{t.changelog.title}</h1>
    <p class="log__note">{t.changelog.note}</p>

    {#each data.releases as release (release.name)}
      <section class="log__release" aria-labelledby="r-{release.name}">
        <h2 id="r-{release.name}">
          {release.name === "Unreleased" ? t.changelog.unreleased : `v${release.name}`}
          {#if release.date}<span class="log__date"><time datetime={release.date}>{release.date}</time>{#if release.tag} · {release.tag}{/if}</span>{/if}
        </h2>
        {#each release.intro as line, i (i)}
          <p>{@render segments(line)}</p>
        {/each}
        {#each release.sections as section (section.title)}
          <h3>{section.title}</h3>
          <ul>
            {#each section.items as item, i (i)}
              <li>{@render segments(item)}</li>
            {/each}
          </ul>
        {/each}
      </section>
    {/each}
  </article>
</div>
