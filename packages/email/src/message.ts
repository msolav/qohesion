import type { Address, EmailMessage } from "./types.js";

const ADDRESS = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

export function isEmailAddress(value: string): boolean {
  return value.length <= 254 && ADDRESS.test(value);
}

const hasLineBreak = (value: string) => /[\r\n]/.test(value);

function checkAddress(label: string, a: Address | undefined, problems: string[]): void {
  if (!a) return;
  if (!isEmailAddress(a.email)) problems.push(`${label}: not a valid address`);
  if (a.name !== undefined && hasLineBreak(a.name)) problems.push(`${label}: name contains a line break`);
}

/** Returns the problems of a message. An empty list means it can be sent. */
export function validateMessage(m: EmailMessage): string[] {
  const problems: string[] = [];
  checkAddress("from", m.from, problems);
  checkAddress("to", m.to, problems);
  checkAddress("replyTo", m.replyTo, problems);
  if (m.subject.trim() === "") problems.push("subject is empty");
  if (m.subject.length > 200) problems.push("subject is longer than 200 characters");
  if (hasLineBreak(m.subject)) problems.push("subject contains a line break");
  if (m.text.trim() === "") problems.push("text body is empty");
  if (m.unsubscribeUrl !== undefined && !/^https:\/\/[^\s<>]+$/.test(m.unsubscribeUrl)) {
    problems.push("unsubscribeUrl must be an https address");
  }
  if (m.unsubscribeMailto !== undefined && !isEmailAddress(m.unsubscribeMailto)) {
    problems.push("unsubscribeMailto is not a valid address");
  }
  for (const [name, value] of Object.entries(m.headers ?? {})) {
    if (!/^[A-Za-z0-9-]+$/.test(name)) problems.push(`header "${name}": invalid name`);
    if (hasLineBreak(value)) problems.push(`header "${name}": value contains a line break`);
  }
  return problems;
}

/** Custom headers plus the one-click unsubscribe headers (RFC 8058) when an address is given. */
export function buildHeaders(m: EmailMessage): Record<string, string> {
  const headers: Record<string, string> = { ...(m.headers ?? {}) };
  const targets: string[] = [];
  if (m.unsubscribeUrl) targets.push(`<${m.unsubscribeUrl}>`);
  if (m.unsubscribeMailto) targets.push(`<mailto:${m.unsubscribeMailto}>`);
  if (targets.length > 0) headers["List-Unsubscribe"] = targets.join(", ");
  if (m.unsubscribeUrl) headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  return headers;
}

export function formatAddress(a: Address): string {
  // Brackets, quotes and backslashes would let a name pose as part of the address ("Org <ceo@bank.example>").
  const name = (a.name ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[<>"\\]/g, "").replace(/\s+/g, " ").trim();
  return name ? `${name} <${a.email}>` : a.email;
}
