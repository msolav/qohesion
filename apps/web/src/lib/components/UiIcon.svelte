<script lang="ts">
  import { UI_ICONS } from "#lib/ui-icons.js";

  let { name, size = 20 }: { name: string; size?: number } = $props();
</script>

<svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false"><path d={UI_ICONS[name] ?? ""} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
