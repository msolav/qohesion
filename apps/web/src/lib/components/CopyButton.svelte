<script lang="ts">
  let { text, label, done, small = false }: { text: string; label: string; done: string; small?: boolean } = $props();
  let copied = $state(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // The clipboard can be unavailable (an address that is not https). The text stays selectable.
    }
  }
</script>

<button type="button" class="cx-btn ghost{small ? ' small' : ''}" onclick={copy}>
  <span aria-live="polite">{copied ? done : label}</span>
</button>
