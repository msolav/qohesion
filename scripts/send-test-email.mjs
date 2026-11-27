// Sends one test email through Brevo's transactional API, to check the sending domain.
// The key is read from the environment and is never printed.
//
//   export BREVO_API_KEY="..."                 (in your own terminal, not in a chat)
//   export TEST_TO="an address you control"
//   node scripts/send-test-email.mjs
//
// Optional: FROM_EMAIL (default noreply@qohesion.app), FROM_NAME (default Qohesion).
//
// Inbox-placement test with a seed list (for example EasyDMARC's): TEST_TO_FILE=path/to/list.txt (addresses separated by
// commas or lines, kept outside the repository) and TEST_CODE=the code the service shows. One message is sent to each
// address, separately, so recipients do not see one another, and the code is added to the body.

const key = process.env.BREVO_API_KEY;
import { readFileSync } from "node:fs";

const fromFile = process.env.TEST_TO_FILE ? readFileSync(process.env.TEST_TO_FILE, "utf8") : "";
const recipients = [...new Set(`${process.env.TEST_TO ?? ""},${fromFile}`.split(/[\s,;]+/).filter((a) => a.includes("@")))];
const to = recipients[0];
const code = process.env.TEST_CODE ?? "";
const fromEmail = process.env.FROM_EMAIL ?? "noreply@qohesion.app";
const fromName = process.env.FROM_NAME ?? "Qohesion";

if (!key || !to) {
  console.error("Set BREVO_API_KEY and TEST_TO first (see the comment at the top of this file).");
  process.exit(2);
}

const sentAt = new Date().toISOString();
const body = {
  sender: { email: fromEmail, name: fromName },
  to: [{ email: to }],
  subject: `Test d'envoi Qohesion / Qohesion sending test (${sentAt})`,
  textContent:
    (code ? `Code: ${code}\n\n` : "") +
    `Ce courriel vérifie la configuration d'envoi. Aucune action n'est requise.\n` +
    `This email checks the sending configuration. No action is required.\n\n` +
    `Lien de contrôle / Check link: https://qohesion.app/\n\n` +
    `Envoyé / Sent: ${sentAt}`,
  htmlContent:
    (code ? `<p>Code: ${code}</p>` : "") +
    `<p>Ce courriel vérifie la configuration d'envoi. Aucune action n'est requise.</p>` +
    `<p>This email checks the sending configuration. No action is required.</p>` +
    `<p>Lien de contrôle / Check link: <a href="https://qohesion.app/">https://qohesion.app/</a></p>` +
    `<p>Envoyé / Sent: ${sentAt}</p>`,
  headers: {
    "List-Unsubscribe": "<https://qohesion.app/unsubscribe-test>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
  tags: ["sending-test"],
};

let accepted = 0;
let rejected = 0;
let lastId = "unknown";
for (const address of recipients) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ ...body, to: [{ email: address }] }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    accepted++;
    lastId = data.messageId ?? lastId;
  } else {
    rejected++;
    console.error(`Rejected (HTTP ${response.status}): ${data.message ?? "no detail"}`);
    if (response.status === 401 || response.status === 403 || response.status === 429) break;
  }
  if (recipients.length > 1) await new Promise((r) => setTimeout(r, 250));
}
console.log(`Accepted by Brevo: ${accepted} of ${recipients.length}. Last message id: ${lastId}`);
if (recipients.length === 1 && accepted === 1) {
  console.log("Next, in the inbox: open the message, choose 'Show original', and check:");
  console.log("  - SPF: PASS, DKIM: PASS, DMARC: PASS");
  console.log("  - the signing domain is the sending domain, not brevo.com");
  console.log("  - whether a 'Sent with Brevo' footer appears");
  console.log("  - then download the message (three dots, 'Download message') and run:");
  console.log("      python3 -I scripts/inspect-eml.py path/to/message.eml");
  console.log("    The check link must stay https://qohesion.app/ (not wrapped), with no tracking image.");
  console.log("  - whether it landed in the inbox, promotions or spam");
}
process.exit(rejected === 0 ? 0 : 1);
