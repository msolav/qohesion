import type { PageServerLoad } from "./$types";
import changelogText from "../../../../../../CHANGELOG.md?raw";
import { parseChangelog } from "#lib/changelog.js";

export const prerender = false;

export const load: PageServerLoad = () => ({ releases: parseChangelog(changelogText) });
