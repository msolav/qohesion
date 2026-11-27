<script lang="ts">
  import "../lib/styles/base.css";
  import "../lib/styles/theme-seed-packet.css";
  import "../lib/styles/theme-ballot-paper.css";
  import "../lib/styles/theme-boarding-pass.css";
  import "../lib/styles/theme-guide-map.css";
  import "../lib/styles/theme-standard.css";
  import "../lib/styles/app.css";
  import "../lib/styles/console.css";
  import type { LayoutProps } from "./$types";

  let { data, children }: LayoutProps = $props();

  // The language switcher navigates without reloading the page, so what someone typed in a form is kept.
  // The document language follows the displayed language.
  $effect(() => {
    document.documentElement.lang = data.locale;
  });
</script>

{@render children()}
