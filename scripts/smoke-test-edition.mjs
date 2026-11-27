#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Walks the test edition end to end against a running server: creates an organization, signs in, creates a poll with
// live results, adds a roll, opens it, votes, reads the results as each kind of viewer, closes, and checks a receipt.
// Usage: node scripts/smoke-test-edition.mjs [http://127.0.0.1:3000]
// The server must run with QOHESION_EDITION=test. Everything it creates is a new organization, left in the database.

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failures++;
};

class Client {
  cookie = "";
  async send(path, { method = "GET", form } = {}) {
    const headers = { origin: base, accept: "text/html,application/json" };
    if (this.cookie) headers.cookie = this.cookie;
    let body;
    if (form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(form).toString();
    }
    const response = await fetch(base + path, { method, headers, body, redirect: "manual" });
    for (const c of response.headers.getSetCookie?.() ?? []) {
      const pair = c.split(";")[0];
      if (pair.startsWith("qs=")) this.cookie = pair.endsWith("=") ? "" : pair;
    }
    return { status: response.status, location: response.headers.get("location") ?? "", text: await response.text() };
  }
}

const admin = new Client();
const anonymous = new Client();

const created = await admin.send("/start", { method: "POST", form: { name: "Smoke Test Association" } });
const key = /QK-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}/.exec(created.text)?.[0];
check("creating an organization shows a key once", Boolean(key));
check("creating an organization signs in", admin.cookie.startsWith("qs="));

const other = new Client();
const refused = await other.send("/signin", { method: "POST", form: { key: "QK-AAAAAA-AAAAAA-AAAAAA-AAAAAA" } });
check("an unknown key is refused", refused.status === 400 && other.cookie === "");
const accepted = await other.send("/signin", { method: "POST", form: { key } });
check("the key signs in", accepted.status === 303 && other.cookie.startsWith("qs="));

check("the console needs a session", (await anonymous.send("/console/polls")).status === 303);

const made = await admin.send("/console/polls/new", { method: "POST", form: { title: "Adopt the 2027 budget", kind: "yes-no", timing: "live", audience: "voters", theme: "ballot-paper", duration: "manual" } });
const pollId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(made.location)?.[1];
check("a poll is created", Boolean(pollId), made.location);

const roll = await admin.send(`/console/polls/${pollId}/roll?/add`, { method: "POST", form: { addresses: "one@example.com\ntwo@example.com\nthree@example.com" } });
check("addresses are added", roll.status === 200);
const rollPage = await admin.send(`/console/polls/${pollId}/roll`);
const links = [...rollPage.text.matchAll(/\/v\/([0-9A-Z]{24})/g)].map((m) => m[1]);
const tokens = [...new Set(links)];
check("each address has a personal link", tokens.length === 3, String(tokens.length));

const early = await anonymous.send(`/v/${tokens[0]}`);
check("a voter cannot vote before opening", early.text.includes("not open yet") || early.text.includes("pas encore ouvert"));

const opened = await admin.send(`/console/polls/${pollId}?/open`, { method: "POST", form: {} });
check("the poll opens", opened.status === 303);

const ballot = await anonymous.send(`/v/${tokens[0]}`);
check("the ballot shows the results rule", ballot.text.includes("live") || ballot.text.includes("direct"));
const cast = await anonymous.send(`/v/${tokens[0]}`, { method: "POST", form: { choice: "for" } });
const receipt = /[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/.exec(cast.text)?.[0];
check("a ballot is recorded and a receipt shown", Boolean(receipt));
const again = await anonymous.send(`/v/${tokens[0]}`, { method: "POST", form: { choice: "against" } });
check("a second ballot with the same link is refused", again.status === 400 || again.text.includes("already"));
await anonymous.send(`/v/${tokens[1]}`, { method: "POST", form: { choice: "against" } });

const asVoter = await anonymous.send(`/api/results/${pollId}?t=${tokens[2]}`);
const voterView = JSON.parse(asVoter.text);
check("a member sees live totals", voterView.counts?.for === 1 && voterView.counts?.against === 1, asVoter.text);
const asPublic = JSON.parse((await anonymous.send(`/api/results/${pollId}`)).text);
check("the public sees nothing when the audience is members", asPublic.counts === null && asPublic.turnout === null, JSON.stringify(asPublic));
const asAdmin = JSON.parse((await admin.send(`/api/results/${pollId}`)).text);
check("an administrator sees the totals", asAdmin.counts?.for === 1);

const closed = await admin.send(`/console/polls/${pollId}?/close`, { method: "POST", form: {} });
check("the poll closes", closed.status === 303);
const late = await anonymous.send(`/v/${tokens[2]}`, { method: "POST", form: { choice: "for" } });
check("voting after the close is refused", late.status === 400);

const ledger = await admin.send(`/console/polls/${pollId}/results`);
check("the closed poll shows its ledger", ledger.text.includes(receipt ?? "?"));
const checked = await admin.send(`/console/polls/${pollId}/results?/check`, { method: "POST", form: { receipt: receipt?.toLowerCase() ?? "" } });
check("a receipt is checked against the ledger", checked.status === 200);

// A sealed poll: ballots are encrypted, totals stay hidden, and the count needs the counting key.
const sealed = await admin.send("/console/polls/new", { method: "POST", form: { title: "Sealed question", kind: "yes-no", timing: "close", audience: "voters", theme: "ballot-paper", duration: "manual", encryption: "sealed" } });
const sealedId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(sealed.location)?.[1];
check("a sealed poll is created", Boolean(sealedId), sealed.location);
await admin.send(`/console/polls/${sealedId}/roll?/add`, { method: "POST", form: { addresses: "s1@example.com\ns2@example.com" } });
const sealedTokens = [...new Set([...(await admin.send(`/console/polls/${sealedId}/roll`)).text.matchAll(/\/v\/([0-9A-Z]{24})/g)].map((m) => m[1]))];
const sealedOpen = await admin.send(`/console/polls/${sealedId}?/open`, { method: "POST", form: {} });
const countingKey = /QC(?:-[0-9A-Z]{1,4}){13}/.exec(sealedOpen.text)?.[0];
check("opening a sealed poll shows the counting key once", Boolean(countingKey));
const sealedBallot = await anonymous.send(`/v/${sealedTokens[0]}`);
check("the ballot says it is encrypted", sealedBallot.text.includes("encrypted") || sealedBallot.text.includes("chiffré"));
await anonymous.send(`/v/${sealedTokens[0]}`, { method: "POST", form: { choice: "for" } });
await anonymous.send(`/v/${sealedTokens[1]}`, { method: "POST", form: { choice: "for" } });
const hidden = JSON.parse((await admin.send(`/api/results/${sealedId}`)).text);
check("a sealed poll shows turnout but no totals while open", hidden.turnout === 2 && hidden.counts === null, JSON.stringify(hidden));
const wrong = await admin.send(`/console/polls/${sealedId}?/close`, { method: "POST", form: { countingKey: "QC-0000-0000" } });
check("a wrong counting key does not close the poll", wrong.status === 400);
const right = await admin.send(`/console/polls/${sealedId}?/close`, { method: "POST", form: { countingKey } });
check("the right counting key closes and counts", right.status === 303);
const counted = JSON.parse((await admin.send(`/api/results/${sealedId}`)).text);
check("totals appear after the count", counted.counts?.for === 2, JSON.stringify(counted));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
