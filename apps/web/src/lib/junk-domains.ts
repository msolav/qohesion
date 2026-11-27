// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Providers that filed the messages of our sending set-up as junk in the placement test of 2026-11-27 (issue #91).
 * The list is a warning for administrators, not a rule: it changes with the sending set-up and is revised after each
 * new test.
 */
const JUNK_PRONE = new Set([
  "outlook.com", "outlook.fr", "outlook.ca", "hotmail.com", "hotmail.fr", "hotmail.ca", "live.com", "live.ca", "live.fr", "msn.com",
  "yahoo.com", "yahoo.ca", "yahoo.fr", "ymail.com", "rocketmail.com",
  "aol.com",
  "gmx.com", "gmx.net", "gmx.de", "gmx.fr", "web.de",
  "icloud.com", "me.com", "mac.com",
  "att.net", "sbcglobal.net", "interia.pl",
]);

/** True when an address is at a provider that often files our messages as junk. */
export function mayReachJunk(address: string): boolean {
  const at = address.lastIndexOf("@");
  return at > 0 && JUNK_PRONE.has(address.slice(at + 1).toLowerCase());
}
