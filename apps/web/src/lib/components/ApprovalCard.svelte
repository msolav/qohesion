<script lang="ts">
  import { enhance } from "$app/forms";
  import { tick } from "svelte";
  import { consoleMessages, fill } from "#lib/i18n/console.js";
  import type { Locale } from "#lib/i18n/negotiate.js";
  import { formatMoment } from "#lib/zoned.js";
  import type { ApprovalRequest } from "#lib/server/approvals.js";

  /**
   * One request for approval: what it covers, who asked, who answered, and, while it waits, the three answers.
   * The form names the content code the administrator is shown, so that an answer is refused if the content changed.
   */
  let { request, locale, timeZone, me, canAnswer, action = "?/answer", showLink = true }: { request: ApprovalRequest; locale: Locale; timeZone: string; me: string; canAnswer: boolean; action?: string; showLink?: boolean } = $props();

  const m = $derived(consoleMessages[locale]);
  const at = (iso: string) => formatMoment(iso, locale, timeZone);
  const mine = $derived(request.answers.find((a) => a.keyId === me)?.answer ?? null);
  const code = $derived(request.digest.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, "$1-"));
  const p = $derived(request.payload);
  const fields = $derived((p["fields"] ?? {}) as Record<string, unknown>);
  let status: HTMLElement | undefined = $state();
  const delay = (hours: unknown) => `${String(hours)} h`;

  const summary = $derived.by(() => {
    const title = String(p["title"] ?? "");
    if (request.kind === "open_scheduled") return { head: fill(m.approval.kindOpenScheduled, { title }), detail: "" };
    if (request.kind === "close_poll") return { head: fill(m.approval.kindClose, { title }), detail: "" };
    if (request.kind === "cancel_poll") return { head: fill(m.approval.kindCancel, { title }), detail: "" };
    if (request.kind === "add_roll") return { head: fill(m.approval.kindAddRoll, { n: String(p["count"] ?? ""), title }), detail: "" };
    if (request.kind === "add_key") return { head: fill(m.approval.kindAddKey, { label: String(p["label"] ?? ""), roles: ((p["roles"] ?? []) as string[]).map((r) => (r === "owner" ? m.role.owner : m.role.administrator)).join(", ") }), detail: "" };
    if (request.kind === "revoke_key") return { head: fill(m.approval.kindRevokeKey, { label: String(p["label"] ?? "") }), detail: "" };
    if (request.kind === "delete_space") return { head: fill(m.approval.kindDelete, { name: String(p["name"] ?? "") }), detail: "" };
    if (request.kind === "publish_poll") return { head: fill(m.approval.kindPublish, { title: String(fields["title"] ?? "") }), detail: "" };
    if (request.kind === "set_policy") {
      const rule = m.approval.rules[p["rule"] as "none" | "majority" | "all"] ?? "";
      const meaning = m.approval.meanings[p["abstention"] as "agreement" | "disagreement" | "neutral" | "discarded"] ?? "";
      return { head: m.approval.kindPolicy, detail: fill(m.approval.policySummary, { rule, meaning, delay: delay(p["delayHours"]) }) };
    }
    return { head: m.approval.kindSettings, detail: fill(m.approval.settingsSummary, { name: String(p["name"] ?? ""), language: p["locale"] === "en" ? "English" : "Français", timeZone: String(p["timeZone"] ?? "") }) };
  });
</script>

<article class="cx-approval" data-status={request.status}>
  <header>
    <h3>{summary.head}</h3>
    <span class="cx-chip {request.status === 'approved' || request.status === 'applied' ? 'open' : ''}">{m.approval.status[request.status]}</span>
  </header>
  {#if summary.detail}<p>{summary.detail}</p>{/if}
  <p class="cx-help">{fill(m.approval.asked, { who: request.proposer, date: at(request.createdAt) })}{#if request.status === "pending"}{" · "}{fill(m.approval.expires, { date: at(request.expiresAt) })}{/if}</p>
  <p class="cx-help">{fill(m.approval.counts, { a: request.tally.approvals, needed: request.tally.needed })}{" · "}{fill(m.approval.code, { code })}</p>
  {#if request.answers.length > 0}
    <ul class="cx-answers">
      {#each request.answers as a (a.keyId)}<li><b>{a.label}</b> {m.approval.answerName[a.answer]}</li>{/each}
    </ul>
  {/if}
  {#if showLink && request.kind === "publish_poll"}<p><a href="/console/polls/{request.subject}">{m.approval.goToPoll}</a></p>{/if}
  {#if request.status === "pending" && canAnswer}
    <p class="cx-help" role="status" tabindex="-1" bind:this={status}>{#if mine}{fill(m.approval.answerRecorded, { answer: m.approval.answerName[mine] })}{/if}</p>
    <form
      class="cx-actions"
      method="POST"
      {action}
      use:enhance={() => async ({ update }) => {
        await update();
        await tick();
        status?.focus();
      }}>
      <input type="hidden" name="request" value={request.id} />
      <input type="hidden" name="digest" value={request.digest} />
      <button class="cx-btn" type="submit" name="answer" value="approve" aria-pressed={mine === "approve"}>{m.approval.approve}<span class="sr-only"> · {summary.head}</span></button>
      <button class="cx-btn ghost" type="submit" name="answer" value="reject" aria-pressed={mine === "reject"}>{m.approval.reject}<span class="sr-only"> · {summary.head}</span></button>
      <button class="cx-btn ghost" type="submit" name="answer" value="abstain" aria-pressed={mine === "abstain"}>{m.approval.abstain}<span class="sr-only"> · {summary.head}</span></button>
    </form>
  {/if}
</article>
