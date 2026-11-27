<script lang="ts">
  /**
   * A button that asks before it acts, in the look of the console and not in the browser's own box. The button opens a
   * native dialog (focus is kept inside it, Escape closes it, the page behind is inert); confirming submits the form named
   * by `formId`. The safe answer, going back, has the focus.
   */
  let {
    formId,
    label,
    title = label,
    message,
    confirmLabel = label,
    backLabel,
    kind = "primary",
    small = false,
  }: { formId: string; label: string; title?: string; message: string; confirmLabel?: string; backLabel: string; kind?: "primary" | "ghost" | "danger"; small?: boolean } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let backButton: HTMLButtonElement | undefined = $state();
  const id = $props.id();

  function ask(): void {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    // A field the form needs (a key, a name) is checked first, so the question is not asked for nothing.
    if (form && !form.reportValidity()) return;
    dialog?.showModal();
    backButton?.focus();
  }
</script>

<button type="button" class="cx-btn {kind === 'primary' ? '' : kind}{small ? ' small' : ''}" onclick={ask}>{label}</button>

<dialog class="cx-dialog" bind:this={dialog} aria-labelledby="dlg-{id}" aria-describedby="dlg-msg-{id}">
  <h2 id="dlg-{id}">{title}</h2>
  <p id="dlg-msg-{id}">{message}</p>
  <div class="cx-actions">
    <button type="button" class="cx-btn ghost" bind:this={backButton} onclick={() => dialog?.close()}>{backLabel}</button>
    <button type="submit" form={formId} class="cx-btn {kind === 'danger' ? 'danger' : ''}" onclick={() => dialog?.close()}>{confirmLabel}</button>
  </div>
</dialog>
