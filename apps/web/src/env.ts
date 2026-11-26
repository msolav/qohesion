import { defineEnvVars } from "@sveltejs/kit/env";
import { sourceUrl } from "#lib/source.js";

/** Environment variables read when the application starts. */
export const variables = defineEnvVars({
  QOHESION_SOURCE_URL: {
    schema: (value) => sourceUrl(value),
    description: "Address of the published source of this installation (AGPL). Defaults to the upstream repository.",
  },
});
