#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Walks the test edition end to end against a running server: creates an organization, signs in, creates a poll with
// live results, adds a roll, opens it, votes, reads the results as each kind of viewer, closes, and checks a receipt.
// Usage: node scripts/smoke-test-edition.mjs [http://127.0.0.1:3000]
// When the server has a password (QOHESION_GATE_PASSWORD), give it as GATE_PASSWORD in the environment.
// The server must run with QOHESION_EDITION=test. Everything it creates is a new organization, left in the database.

const base = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `: ${detail}`}`);
  if (!ok) failures++;
};

class Client {
  cookies = new Map();
  get cookie() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  get session() {
    return this.cookies.get("qs") ?? "";
  }
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
      const [name, ...rest] = c.split(";")[0].split("=");
      const value = rest.join("=");
      if (value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return { status: response.status, location: response.headers.get("location") ?? "", text: await response.text() };
  }
  async passGate() {
    if (process.env.GATE_PASSWORD) await this.send("/gate", { method: "POST", form: { password: process.env.GATE_PASSWORD, next: "/" } });
  }
}

// A week from now, as a date-and-time input value (the server reads it in the time zone of the organization).
const closing = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 16);

const admin = new Client();
const anonymous = new Client();
const other = new Client();
for (const c of [admin, anonymous, other]) await c.passGate();

// An installation holds one organization. On a fresh installation the script sets it up; on one that is already set up,
// give the key of an owner as SMOKE_KEY and the script signs in with it and adds its own poll.
let key = process.env.SMOKE_KEY;
if (key) {
  const signedIn = await admin.send("/signin", { method: "POST", form: { key } });
  check("the given key signs in", signedIn.status === 303 && admin.session !== "");
} else {
  const probe = await admin.send("/start");
  if (probe.status === 303) {
    console.error("This installation already has its organization. Give the key of an owner as SMOKE_KEY.");
    process.exit(2);
  }
  const created = await admin.send("/start", { method: "POST", form: { name: "Smoke Test Association" } });
  key = /QK-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}/.exec(created.text)?.[0];
  check("setting up the organization shows a key once", Boolean(key));
  check("setting up the organization signs in", admin.session !== "");
  const again = await anonymous.send("/start");
  check("a second organization cannot be set up", again.status === 303);
}

const refused = await other.send("/signin", { method: "POST", form: { key: "QK-AAAAAA-AAAAAA-AAAAAA-AAAAAA" } });
check("an unknown key is refused", refused.status === 400 && other.session === "");
const accepted = await other.send("/signin", { method: "POST", form: { key } });
check("the key signs in", accepted.status === 303 && other.session !== "");

check("the console needs a session", (await anonymous.send("/console/polls")).status === 303);

const made = await admin.send("/console/polls/new", { method: "POST", form: { title: "Budget 2027", question: "Do you adopt the budget for 2027?", kind: "yes-no", timing: "live", audience: "voters", theme: "ballot-paper", closes_at: closing } });
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

// A named poll: names on the roll, and the list of signatories shown as the poll sets it.
const namedMade = await admin.send("/console/polls/new", { method: "POST", form: { title: "Named poll", question: "Do you agree?", kind: "yes-no", timing: "live", audience: "voters", theme: "ballot-paper", closes_at: closing, anonymity: "named", disclosure_name: "masked", disclosure_email: "masked" } });
const namedId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(namedMade.location)?.[1];
check("a named poll is created", Boolean(namedId), namedMade.location);
await admin.send(`/console/polls/${namedId}/roll?/add`, { method: "POST", form: { addresses: 'Marie Tremblay <marie.tremblay@example.com>\n"Roy, Jean" <jean@example.com>' } });
const namedRoll = await admin.send(`/console/polls/${namedId}/roll`);
check("names are kept beside the addresses", namedRoll.text.includes("Marie Tremblay") && namedRoll.text.includes("Roy, Jean"));
const namedTokens = [...new Set([...namedRoll.text.matchAll(/\/v\/([0-9A-Z]{24})/g)].map((m) => m[1]))];
await admin.send(`/console/polls/${namedId}?/open`, { method: "POST", form: {} });
const namedRules = await anonymous.send(`/v/${namedTokens[0]}?view=all`);
check("the ballot lists its settings with a link to the explanation", namedRules.text.includes('class="prop"') && namedRules.text.includes("/how?lang=") && namedRules.text.includes("Marie T***"));
await anonymous.send(`/v/${namedTokens[0]}`, { method: "POST", form: { choice: "for" } });
await anonymous.send(`/v/${namedTokens[1]}`, { method: "POST", form: { choice: "against" } });
const namedAsVoter = JSON.parse((await anonymous.send(`/api/results/${namedId}?t=${namedTokens[0]}`)).text);
const readWho = (view) => (view.answers ?? []).map((a) => a.who).sort().join("|");
check("a member reads the signatories as the poll sets them", readWho(namedAsVoter) === "Marie T*** <m***y@e***e.com>|Roy, J*** <j***n@e***e.com>", readWho(namedAsVoter));
const namedAsAdmin = JSON.parse((await admin.send(`/api/results/${namedId}`)).text);
check("an administrator reads the full entry", readWho(namedAsAdmin).includes("Marie Tremblay <marie.tremblay@example.com>"), readWho(namedAsAdmin));
await admin.send(`/console/polls/${namedId}?/close`, { method: "POST", form: {} });

// The pages that explain the settings and the voting methods.
const how = await anonymous.send("/how?lang=en");
check("the page on how a poll works explains secrecy and encryption", how.status === 200 && how.text.includes("Anonymous ballot") && how.text.includes("Encrypted ballots") && how.text.includes("AES-256-GCM"));
const methods = await anonymous.send("/methods?lang=fr");
check("the page on voting methods lists them in French", methods.status === 200 && methods.text.includes("Jugement majoritaire") && methods.text.includes("Prévu"));

// A poll shown one page at a time: introduction first, the same ballot on one page by link, a calendar file with an alarm.
const paged = await admin.send("/console/polls/new", { method: "POST", form: { title: "Paged poll", question: "Do you agree?", kind: "yes-no", timing: "close", audience: "voters", theme: "ballot-paper", closes_at: closing, paged: "yes" } });
const pagedId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(paged.location)?.[1];
check("a paged poll is created", Boolean(pagedId), paged.location);
await admin.send(`/console/polls/${pagedId}/roll?/add`, { method: "POST", form: { addresses: "p1@example.com" } });
const pagedLinks = [...new Set([...(await admin.send(`/console/polls/${pagedId}/roll`)).text.matchAll(/\/v\/([0-9A-Z]{24})/g)].map((m) => m[1]))];
await admin.send(`/console/polls/${pagedId}?/open`, { method: "POST", form: {} });
if (process.env.SMOKE_PRINT_LINK) console.log(`${base}/v/${pagedLinks[0]}`);
const intro = await anonymous.send(`/v/${pagedLinks[0]}`);
check("a paged ballot starts with its introduction", intro.text.includes('data-step="intro"') && intro.text.includes("?view=all"));
const onePage = await anonymous.send(`/v/${pagedLinks[0]}?view=all`);
check("the same ballot can be shown on one page", onePage.text.includes('data-step="all"'));
const ics = await anonymous.send(`/v/${pagedLinks[0]}/calendar.ics`);
check("a calendar file gives the closing time with an alarm 24 hours before", ics.status === 200 && ics.text.includes("TRIGGER:-PT24H") && ics.text.includes("BEGIN:VEVENT"));
check("the calendar file holds no personal link", !ics.text.includes(pagedLinks[0] ?? "?"));

// A poll with several questions: one page of answers each, one ballot, one receipt.
const manyForm = [["title", "Two questions"], ["question", "Do you agree?"], ["kind", "yes-no"], ["timing", "close"], ["audience", "voters"], ["theme", "ballot-paper"], ["closes_at", closing], ["paged", "yes"], ["question_order", "2"], ["q2_kind", "choice"], ["q2_question", "Who chairs?"], ["q2_option", "Ana"], ["q2_option", "Ben"], ["q2_option_icon", ""], ["q2_option_color", ""], ["q2_option_icon", ""], ["q2_option_color", ""]];
const many = await admin.send("/console/polls/new", { method: "POST", form: manyForm });
const manyId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(many.location)?.[1];
check("a poll with two questions is created", Boolean(manyId), many.location);
await admin.send(`/console/polls/${manyId}/roll?/add`, { method: "POST", form: { addresses: "m1@example.com\nm2@example.com" } });
const manyTokens = [...new Set([...(await admin.send(`/console/polls/${manyId}/roll`)).text.matchAll(/\/v\/([0-9A-Z]{24})/g)].map((m) => m[1]))];
await admin.send(`/console/polls/${manyId}?/open`, { method: "POST", form: {} });
if (process.env.SMOKE_PRINT_LINK) console.log(`MANY ${base}/v/${manyTokens[1]}`);
const manyBallot = await anonymous.send(`/v/${manyTokens[0]}?view=all`);
check("the ballot shows a group of choices for each question", manyBallot.text.includes('name="a_q1"') && manyBallot.text.includes('name="a_q2"') && manyBallot.text.includes("Who chairs?"));
const partial = await anonymous.send(`/v/${manyTokens[0]}`, { method: "POST", form: { a_q1: "for" } });
check("a ballot missing an answer is refused", partial.status === 400);
const manyCast = await anonymous.send(`/v/${manyTokens[0]}`, { method: "POST", form: { a_q1: "for", a_q2: "o2" } });
check("a ballot with every answer gets one receipt", /[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}/.test(manyCast.text) && manyCast.text.includes("2"));

// A sealed poll: ballots are encrypted, totals stay hidden, and the count needs the counting key.
const sealed = await admin.send("/console/polls/new", { method: "POST", form: { title: "Sealed poll", question: "Do you agree?", kind: "yes-no", timing: "close", audience: "voters", theme: "ballot-paper", closes_at: closing, encryption: "sealed" } });
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

// Approvals between administrators: with a second administrator and the rule "all", a draft waits for the other's answer.
const added = await admin.send("/console/space?/addKey", { method: "POST", form: { label: "Clerk", role: "administrator" } });
const clerkKey = /QK-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}/.exec(added.text)?.[0];
check("a second administrator key is made", Boolean(clerkKey));
const clerk = new Client();
await clerk.passGate();
await clerk.send("/signin", { method: "POST", form: { key: clerkKey } });
const ruled = await admin.send("/console/space?/policy", { method: "POST", form: { rule: "all", abstention: "neutral", delay_hours: "168" } });
check("the owner sets the approval rule", ruled.status === 200 && ruled.text.length > 0);
const gated = await admin.send("/console/polls/new", { method: "POST", form: { title: "Needs approval", question: "Do you agree?", kind: "yes-no", timing: "close", audience: "voters", theme: "ballot-paper", closes_at: closing } });
const gatedId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(gated.location)?.[1];
await admin.send(`/console/polls/${gatedId}/roll?/add`, { method: "POST", form: { addresses: "g1@example.com" } });
const refusedOpen = await admin.send(`/console/polls/${gatedId}?/open`, { method: "POST", form: {} });
check("opening without approval is refused", refusedOpen.status === 400);
await admin.send(`/console/polls/${gatedId}?/requestApproval`, { method: "POST", form: {} });
const waiting = await clerk.send("/console/approvals");
check("the other administrator sees the request", waiting.text.includes("Needs approval"));
check("the approvals page shows the organization details to confirm", waiting.text.includes("Organization details") || waiting.text.includes("Renseignements de l’organisation"));
const pairWaiting = /name="request" value="([a-z0-9]+)"[^>]*>\s*<input[^>]*name="digest" value="([0-9a-f]{64})"/.exec(waiting.text);
const requestId = pairWaiting?.[1];
const digest = pairWaiting?.[2];
const answered = await clerk.send("/console/approvals?/answer", { method: "POST", form: { request: requestId, digest, answer: "approve" } });
check("the other administrator approves", answered.status === 200);
const publishedGate = await admin.send(`/console/polls/${gatedId}?/open`, { method: "POST", form: {} });
check("the approved poll opens", publishedGate.status === 303);
const gatedTokens = [...new Set([...(await admin.send(`/console/polls/${gatedId}/roll`)).text.matchAll(/\/v\/([0-9A-Z]{24})/g)].map((m) => m[1]))];
const gatedBallot = await anonymous.send(`/v/${gatedTokens[0]}?view=all`);
check("the ballot says how the poll was approved", gatedBallot.text.includes("2 of 2") || gatedBallot.text.includes("2 administrateurs sur 2"));

// Closing by hand also needs approval: the first press asks, the other administrator approves, the second press closes.
const closeAsk = await admin.send(`/console/polls/${gatedId}?/close`, { method: "POST", form: {} });
check("closing by hand asks for approval instead of closing", closeAsk.status === 200 && (closeAsk.text.includes("Sent to the other administrators") || closeAsk.text.includes("Soumis aux autres administrateurs")));
const closeWaiting = await clerk.send("/console/approvals");
const pairClose = /name="request" value="([a-z0-9]+)"[^>]*>\s*<input[^>]*name="digest" value="([0-9a-f]{64})"/.exec(closeWaiting.text);
const closeId = pairClose?.[1];
const closeDigest = pairClose?.[2];
await clerk.send("/console/approvals?/answer", { method: "POST", form: { request: closeId, digest: closeDigest, answer: "approve" } });
const closeNow = await admin.send(`/console/polls/${gatedId}?/close`, { method: "POST", form: {} });
check("the approved close goes through", closeNow.status === 303);

// The record of governance events: a page, a download with a checkpoint, and no key value in it.
const recordPage = await admin.send("/console/record");
check("the record of changes page shows an intact chain", recordPage.status === 200 && (recordPage.text.includes("Every entry follows from the one before it") || recordPage.text.includes("Chaque entrée découle de la précédente")));
const recordFile = await admin.send("/console/record.json");
check("the record downloads with its checkpoint, and holds no key", recordFile.status === 200 && recordFile.text.includes("qohesion-record-v1") && !recordFile.text.includes(String(clerkKey)) && !recordFile.text.includes(String(key)));

// A request left waiting, and a draft changed after it was asked.
const waitingPoll = await admin.send("/console/polls/new", { method: "POST", form: { title: "Waiting poll", question: "Adopt the rules?", kind: "yes-no", timing: "close", audience: "voters", theme: "ballot-paper", closes_at: closing } });
const waitingId = /\/console\/polls\/([a-z0-9]+)\/roll/.exec(waitingPoll.location)?.[1];
await admin.send(`/console/polls/${waitingId}/roll?/add`, { method: "POST", form: { addresses: "w1@example.com" } });
await admin.send(`/console/polls/${waitingId}?/requestApproval`, { method: "POST", form: {} });
const waitingPage = await admin.send(`/console/polls/${waitingId}`);
check("the overview shows the request while it waits", waitingPage.text.includes("Approvals: 1 of 2") || waitingPage.text.includes("Approbations: 1 sur 2"));
await admin.send(`/console/polls/${waitingId}/roll?/add`, { method: "POST", form: { addresses: "w2@example.com" } });
const stalePage = await admin.send(`/console/polls/${waitingId}`);
check("a change after the request is flagged", stalePage.text.includes("changed after approval was asked") || stalePage.text.includes("a changé après la demande"));
if (process.env.SMOKE_PRINT_LINK) console.log(`KEYS ${key} ${clerkKey} ${waitingId}`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
