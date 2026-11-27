// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Sending of voting links by email in the test edition. The provider key comes from the environment of the server
 * (QOHESION_BREVO_API_KEY) and is never shown on a screen or stored in the database. The daily budget follows
 * ADR 0003: 300 a day on the free plan, 50 of them kept for service emails.
 */

import { BrevoTransport, BudgetedTransport, DailyBudget, invitationMessage, type EmailTransport, type InvitationInput } from "@qohesion/email";
import { QOHESION_BREVO_API_KEY, QOHESION_MAIL_FROM } from "$app/env/private";

let transport: EmailTransport | undefined;

export function mailConfigured(): boolean {
  return QOHESION_BREVO_API_KEY !== "";
}

export function getTransport(): EmailTransport | null {
  if (!mailConfigured()) return null;
  transport ??= new BudgetedTransport(new BrevoTransport({ apiKey: QOHESION_BREVO_API_KEY }), new DailyBudget(300, 50));
  return transport;
}

export interface SendReport {
  readonly sent: readonly number[];
  readonly failed: number;
  readonly firstProblem: string | null;
}

/** Sends one invitation per entry, one after the other, and reports which entries went out. */
export async function sendInvitations(
  entries: readonly { id: number; address: string; link: string }[],
  common: Omit<InvitationInput, "link">,
  send: (message: ReturnType<typeof invitationMessage>) => Promise<{ ok: boolean; reason?: string }> = async (m) => {
    const t = getTransport();
    return t ? t.send(m) : { ok: false, reason: "email is not configured" };
  },
): Promise<SendReport> {
  const sent: number[] = [];
  let failed = 0;
  let firstProblem: string | null = null;
  for (const entry of entries) {
    const message = invitationMessage({ ...common, link: entry.link }, { from: { email: QOHESION_MAIL_FROM, name: "Qohesion" }, to: { email: entry.address } });
    const result = await send(message);
    if (result.ok) sent.push(entry.id);
    else {
      failed++;
      firstProblem ??= result.reason ?? "not sent";
    }
  }
  return { sent, failed, firstProblem };
}
