import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { build } from "#lib/version.js";

/** Version, release channel, commit and build date of the running build. */
export const GET: RequestHandler = () =>
  json(build, { headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } });
