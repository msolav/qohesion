// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../gate/_worker.js";

const PASSWORD = "correct horse battery staple";
let assetCalls = 0;
const env = (secret) => ({
  GATE_PASSWORD: secret,
  ASSETS: { fetch: async () => { assetCalls++; return new Response("<h1>Qohesion</h1>", { status: 200, headers: { "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" } }); } },
});
const basic = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const ask = (headers = {}, e = env(PASSWORD)) => worker.fetch(new Request("https://dev.example/", { headers }), e);

test("a request with no credentials is refused and never reaches the site", async () => {
  assetCalls = 0;
  const response = await ask();
  assert.equal(response.status, 401);
  assert.match(response.headers.get("WWW-Authenticate") ?? "", /^Basic realm=/);
  assert.equal(assetCalls, 0);
  assert.ok(!(await response.text()).includes("Qohesion</h1>"));
});

test("a wrong password, an empty one, a malformed header and another scheme are all refused", async () => {
  assetCalls = 0;
  for (const header of [basic("qohesion", "wrong"), basic("qohesion", ""), "Basic !!!not-base64!!!", "Bearer abc", basic("qohesion", `${PASSWORD} `), basic("qohesion", PASSWORD.toUpperCase()), `Basic ${Buffer.from("nocolon").toString("base64")}`]) {
    assert.equal((await ask({ Authorization: header })).status, 401, header);
  }
  assert.equal(assetCalls, 0);
});

test("the right password lets the request through, whatever the user name", async () => {
  for (const user of ["qohesion", "", "anyone"]) {
    const response = await ask({ Authorization: basic(user, PASSWORD) });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "<h1>Qohesion</h1>");
  }
});

test("a password that contains a colon or non-ASCII characters works", async () => {
  const hard = "pässwörd: with colon ✓ and more";
  const response = await ask({ Authorization: `Basic ${Buffer.from(`u:${hard}`, "utf8").toString("base64")}` }, env(hard));
  assert.equal(response.status, 200);
});

test("answers are never cached and never indexed, the site's own cache rule is overridden", async () => {
  for (const response of [await ask(), await ask({ Authorization: basic("u", PASSWORD) })]) {
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  }
});

test("the gate fails closed: with no password, or a weak one, nothing is served to anyone", async () => {
  assetCalls = 0;
  for (const secret of [undefined, "", "short", null, 12345678901234]) {
    const withCredentials = await ask({ Authorization: basic("u", String(secret ?? "")) }, env(secret));
    assert.equal(withCredentials.status, 503, String(secret));
    assert.equal((await ask({}, env(secret))).status, 503);
  }
  assert.equal(assetCalls, 0);
});

test("a missing page behind the gate is still reported as missing", async () => {
  const notFound = { GATE_PASSWORD: PASSWORD, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  const response = await worker.fetch(new Request("https://dev.example/nope", { headers: { Authorization: basic("u", PASSWORD) } }), notFound);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});
