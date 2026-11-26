<script lang="ts">
  import "../lib/styles/base.css";
  import "../lib/styles/theme-seed-packet.css";
  import "../lib/styles/theme-ballot-paper.css";
  import "../lib/styles/app.css";
  import "../lib/styles/console.css";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

{@render children()}
