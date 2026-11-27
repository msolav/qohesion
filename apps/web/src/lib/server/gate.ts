// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * An optional password in front of the whole test edition (QOHESION_GATE_PASSWORD), so that a test server can be
 * shared with chosen people only. After the password is entered, a cookie proves it. The cookie holds a keyed hash of
 * the password, made with the server secret, never the password itself.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function gateCookieValue(secret: Uint8Array, password: string): string {
  return createHmac("sha256", secret).update(`gate-v1\n${password}`).digest("base64url");
}

export function passwordMatches(entered: string, expected: string): boolean {
  const a = createHash("sha256").update(entered).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** What stays open without the password: the gate itself, the files it needs, and the version check used by monitors. */
export function gateAllows(pathname: string): boolean {
  return pathname === "/gate" || pathname === "/version" || pathname === "/mark.svg" || pathname.startsWith("/_app/");
}

/** Where to go after the gate: a path of this site, never another address. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.startsWith("/gate")) return "/";
  return next;
}
