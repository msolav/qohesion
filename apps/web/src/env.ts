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
  QOHESION_DATA_DIR: {
    schema: (value) => ((value ?? "").trim() === "" ? "./data" : (value ?? "").trim()),
    description: "Folder of the test edition's database and server secret. It must be writable and kept private.",
  },
});
