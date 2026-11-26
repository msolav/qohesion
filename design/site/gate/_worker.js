// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Password gate for the development preview, run by Cloudflare Pages in front of every request.
// The password is the secret GATE_PASSWORD of the Pages project; it is never in the repository.
// The gate fails closed: with no password set, nothing is served. The user name is ignored.

const REALM = "Qohesion development preview";
const BASE = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Content-Type": "text/plain; charset=utf-8" };

async function digest(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Compares two passwords through their hashes, so that the comparison takes the same time whatever the guess. */
async function samePassword(guess, secret) {
  const a = await digest(guess);
  const b = await digest(secret);
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ (b[i] ?? 0);
  return difference === 0;
}

function passwordOf(header) {
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
    const colon = decoded.indexOf(":");
    return colon === -1 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const secret = env.GATE_PASSWORD;
    if (typeof secret !== "string" || secret.length < 12) {
      return new Response("This preview is locked: its password is not set.", { status: 503, headers: BASE });
    }
    const guess = passwordOf(request.headers.get("Authorization") ?? "");
    if (guess === null || !(await samePassword(guess, secret))) {
      return new Response("Authentication required.", { status: 401, headers: { ...BASE, "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` } });
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", BASE["Cache-Control"]);
    headers.set("X-Robots-Tag", BASE["X-Robots-Tag"]);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
