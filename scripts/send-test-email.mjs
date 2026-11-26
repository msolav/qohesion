// Sends one test email through Brevo's transactional API, to check the sending domain.
// The key is read from the environment and is never printed.
//
//   export BREVO_API_KEY="..."                 (in your own terminal, not in a chat)
//   export TEST_TO="an address you control"
//   node scripts/send-test-email.mjs
//
// Optional: FROM_EMAIL (default noreply@mail.qohesion.app), FROM_NAME (default Qohesion).

const key = process.env.BREVO_API_KEY;
const to = process.env.TEST_TO;
const fromEmail = process.env.FROM_EMAIL ?? "noreply@mail.qohesion.app";
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
    `Ce courriel vérifie la configuration d'envoi. Aucune action n'est requise.\n` +
    `This email checks the sending configuration. No action is required.\n\n` +
    `Envoyé / Sent: ${sentAt}`,
  htmlContent:
    `<p>Ce courriel vérifie la configuration d'envoi. Aucune action n'est requise.</p>` +
    `<p>This email checks the sending configuration. No action is required.</p>` +
    `<p>Envoyé / Sent: ${sentAt}</p>`,
  headers: {
    "List-Unsubscribe": "<https://qohesion.app/unsubscribe-test>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
  tags: ["sending-test"],
};

const response = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify(body),
});
const data = await response.json().catch(() => ({}));

if (response.ok) {
  console.log(`Accepted by Brevo (HTTP ${response.status}). Message id: ${data.messageId ?? "unknown"}`);
  console.log("Next, in the inbox: open the message, choose 'Show original', and check:");
  console.log("  - SPF: PASS, DKIM: PASS, DMARC: PASS");
  console.log("  - the signing domain is the sending domain, not brevo.com");
  console.log("  - whether a 'Sent with Brevo' footer appears");
  console.log("  - whether it landed in the inbox, promotions or spam");
} else {
  console.error(`Rejected (HTTP ${response.status}): ${data.message ?? "no detail"}`);
  process.exit(1);
}
