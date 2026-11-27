<script lang="ts">
  /**
   * The roll as a row of seats: one dot for each address, filled when that member has voted. It shows at a glance how far
   * a poll is, without a number to read. Beyond 120 addresses the dots become a bar, so the row never wraps endlessly.
   */
  let { total, voted, label }: { total: number; voted: number; label: string } = $props();

  const dots = $derived(Math.min(total, 120));
  const filled = $derived(total <= 120 ? Math.min(voted, total) : Math.round((Math.min(voted, total) / total) * 120));
  const wide = $derived(total > 120);
</script>

<ul class="roll-strip" class:wide role="img" aria-label={label}>
  {#each { length: dots } as _, i (i)}<li class:on={i < filled}></li>{/each}
</ul>
