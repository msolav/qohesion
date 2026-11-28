<script lang="ts">
  import { isTimeZone } from "#lib/zoned.js";
  import type { Locale } from "#lib/i18n/negotiate.js";

  /**
   * A date and a time as two fields in the style of the console, with shortcuts for the usual delays and the moment written
   * out in full. The value is "YYYY-MM-DDTHH:mm" in the zone of the organization, as the server reads it; the two visible
   * fields carry no name, and a hidden field sends the value.
   */
  let {
    value = $bindable(""),
    zone,
    locale,
    name,
    id,
    label,
    required = false,
    shortcuts = true,
    defaultTime = "20:00",
    describedby,
    texts,
  }: {
    value?: string;
    zone: string;
    locale: Locale;
    name: string;
    id: string;
    label: string;
    required?: boolean;
    shortcuts?: boolean;
    defaultTime?: string;
    describedby?: string;
    texts: { date: string; time: string; tomorrow: string; days3: string; week: string; weeks2: string; none: string };
  } = $props();

  const datePart = $derived(/^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "");
  const timePart = $derived(/T\d{2}:\d{2}$/.test(value) ? value.slice(11, 16) : "");

  function set(date: string, time: string): void {
    value = date === "" ? "" : `${date}T${time === "" ? defaultTime : time}`;
  }

  /** Today in the zone of the organization, as YYYY-MM-DD. */
  function today(): string {
    const tz = isTimeZone(zone) ? zone : "UTC";
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function inDays(days: number): string {
    const [y, m, d] = today().split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  }
  const SHORTCUTS = $derived([
    { key: "tomorrow", days: 1, label: texts.tomorrow },
    { key: "days3", days: 3, label: texts.days3 },
    { key: "week", days: 7, label: texts.week },
    { key: "weeks2", days: 14, label: texts.weeks2 },
  ]);

  /** The chosen moment as a sentence: the weekday, the date and the time. Built from the parts, so no zone conversion is involved. */
  const written = $derived.by(() => {
    if (datePart === "" || timePart === "") return "";
    const [y, mo, d] = datePart.split("-").map(Number) as [number, number, number];
    const [h, mi] = timePart.split(":").map(Number) as [number, number];
    const at = new Date(Date.UTC(y, mo - 1, d, h, mi));
    return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(at);
  });
</script>

<fieldset class="dt">
  <legend class="cx-label">{label}</legend>
  <div class="dt__fields">
    <label class="dt__field"><span>{texts.date}</span><input id="{id}-date" type="date" value={datePart} min={today()} required={required} aria-describedby={describedby} onchange={(e) => set((e.currentTarget as HTMLInputElement).value, timePart)} /></label>
    <label class="dt__field"><span>{texts.time}</span><input id="{id}-time" type="time" step="300" value={timePart || (datePart ? defaultTime : "")} aria-describedby={describedby} onchange={(e) => set(datePart, (e.currentTarget as HTMLInputElement).value)} /></label>
  </div>
  {#if shortcuts}
    <div class="dt__shortcuts" role="group" aria-label={label}>
      {#each SHORTCUTS as s (s.key)}
        <button type="button" class="dt__chip" aria-pressed={datePart === inDays(s.days)} onclick={() => set(inDays(s.days), timePart)}>{s.label}</button>
      {/each}
    </div>
  {/if}
  <input type="hidden" {name} {value} />
  <p class="dt__written" aria-live="polite">{written || texts.none}</p>
</fieldset>
