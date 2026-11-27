import { defineEnvVars } from "@sveltejs/kit/env";
import { sourceUrl } from "#lib/source.js";

/** Environment variables read when the application starts. */
export const variables = defineEnvVars({
  QOHESION_SOURCE_URL: {
    schema: (value) => sourceUrl(value),
    description: "Address of the published source of this installation (AGPL). Defaults to the upstream repository.",
  },
  QOHESION_EDITION: {
    schema: (value) => ((value ?? "").trim() === "test" ? "test" : "standard"),
    description: 'Set to "test" to enable the test edition: spaces, polls, voting and results with unencrypted ballots (ADR 0007).',
  },
  QOHESION_GATE_PASSWORD: {
    schema: (value) => (value ?? "").trim(),
    description: "Optional password in front of the whole test edition. Empty means no password. Use it when a test server is shared with chosen people.",
  },
  QOHESION_BREVO_API_KEY: {
    schema: (value) => (value ?? "").trim(),
    description: "Optional. Brevo API key used by the test edition to email personal voting links. Empty means links are copied by hand.",
  },
  QOHESION_MAIL_FROM: {
    schema: (value) => ((value ?? "").trim() === "" ? "noreply@qohesion.app" : (value ?? "").trim()),
    description: "Sender address of emails sent by the test edition. It must belong to a domain authenticated at the provider.",
  },
  QOHESION_DATA_DIR: {
    schema: (value) => ((value ?? "").trim() === "" ? "./data" : (value ?? "").trim()),
    description: "Folder of the test edition's database and server secret. It must be writable and kept private.",
  },
});
