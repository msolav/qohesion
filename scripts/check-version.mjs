// Checks that the version is declared once (VERSION) and used consistently.
// Run from the repository root: node scripts/check-version.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const problems = [];

const version = readFileSync("VERSION", "utf8").trim();
if (!SEMVER.test(version)) problems.push(`VERSION "${version}" is not a valid Semantic Version (example: 0.1.0)`);

for (const dir of ["packages", "apps"]) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const file = join(dir, name, "package.json");
    if (!existsSync(file)) continue;
    const declared = JSON.parse(readFileSync(file, "utf8")).version;
    if (declared !== version) problems.push(`${file} declares ${declared}, VERSION is ${version}`);
  }
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
if (!/^## \[Unreleased\]/m.test(changelog)) problems.push('CHANGELOG.md has no "## [Unreleased]" section');
const released = [...changelog.matchAll(/^## \[(\d[^\]]*)\]/gm)].map((m) => m[1]);
if (released.length > 0 && released[0] !== version && !SEMVER.test(released[0] ?? "")) {
  problems.push(`CHANGELOG.md newest entry "${released[0]}" is not a valid version`);
}

if (problems.length > 0) {
  console.error("Version check failed:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`Version ${version}: consistent.`);
