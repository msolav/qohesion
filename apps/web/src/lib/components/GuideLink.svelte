<script lang="ts">
  import { tick } from "svelte";
  import HowGuide from "#lib/components/HowGuide.svelte";
  import MethodsGuide from "#lib/components/MethodsGuide.svelte";
  import UiIcon from "#lib/components/UiIcon.svelte";
  import { guideMessages } from "#lib/i18n/guide.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { learnHref } from "#lib/properties.js";

  /**
   * A link to an information page that opens as a pop-up the reader can scroll, so that a form being filled in stays where
   * it is. The pop-up offers the same content as a page of its own. Without the script, or with a click that asks for a new
   * tab (middle button, Ctrl or Cmd), the link goes to the page.
   */
  let { locale, page, anchor, label }: { locale: Locale; page: "how" | "methods"; anchor: string; label: string } = $props();
  const g = $derived(guideMessages[locale]);
  const id = $props.id();

  let dialog: HTMLDialogElement | undefined = $state();
  let body: HTMLDivElement | undefined = $state();
  let current = $state<{ page: "how" | "methods"; anchor: string | undefined }>({ page: "how", anchor: undefined });
  let opener: HTMLElement | null = null;
  const href = $derived(learnHref(locale, { page: current.page, anchor: current.anchor ?? "" }).replace(/#$/, ""));
  const prefix = `gd-${id}-`;

  async function show(to: "how" | "methods", at?: string): Promise<void> {
    current = { page: to, anchor: at };
    await tick();
    const target = at ? body?.querySelector<HTMLElement>(`[id="${prefix}${at}"]`) : null;
    if (target && body) body.scrollTo({ top: target.offsetTop - body.offsetTop - 8 });
    else body?.scrollTo({ top: 0 });
  }

  function open(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = event.currentTarget as HTMLElement;
    dialog?.showModal();
    void show(page, anchor);
  }

  /** A link to a place in the same guide scrolls the pop-up and leaves the address of the screen behind alone. */
  function inside(event: MouseEvent): void {
    const a = (event.target as HTMLElement).closest("a");
    const hash = a?.getAttribute("href");
    if (!a || !hash?.startsWith("#")) return;
    event.preventDefault();
    void show(current.page, hash.slice(1).replace(prefix, ""));
  }

  /** Listens for clicks on the links of the guide, which are made by the guide's own components. */
  function links(node: HTMLElement): { destroy(): void } {
    node.addEventListener("click", inside);
    return { destroy: () => node.removeEventListener("click", inside) };
  }
</script>

<a class="cx-info" href={learnHref(locale, { page, anchor })} target="_blank" rel="noopener" onclick={open}><UiIcon name="info" size={16} />{label}<span class="sr-only"> ({g.props.newTab})</span></a>

<dialog class="gd" bind:this={dialog} aria-labelledby="{prefix}title" onclose={() => opener?.focus()} onclick={(e) => { if (e.target === dialog) dialog?.close(); }}>
  <div class="gd__bar">
    <h2 id="{prefix}title">{current.page === "how" ? g.how.title : g.methods.title}</h2>
    <a class="gd__page" href={href} target="_blank" rel="noopener"><UiIcon name="layout" size={16} />{g.props.openPage}<span class="sr-only"> ({g.props.newTab})</span></a>
    <button type="button" class="cx-btn ghost small" onclick={() => dialog?.close()}>{g.props.close}</button>
  </div>
  <div class="gd__body" bind:this={body} use:links tabindex="-1">
    {#if current.page === "how"}
      <HowGuide {locale} idPrefix={prefix} go={(to, at) => void show(to, at)} />
    {:else}
      <MethodsGuide {locale} idPrefix={prefix} go={(to, at) => void show(to, at)} />
    {/if}
  </div>
</dialog>
