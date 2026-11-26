/** Semantic Versioning 2.0.0. While the major number is 0 the project is in alpha: any minor change may break things. */

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly string[];
}

const PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** Parses "0.1.0", "v0.1.0", "0.2.0-alpha.1". Build metadata after "+" is ignored. Returns null when invalid. */
export function parseVersion(input: string): SemVer | null {
  const m = PATTERN.exec(input.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ? m[4].split(".") : [],
  };
}

export function formatVersion(v: SemVer): string {
  const core = `${v.major}.${v.minor}.${v.patch}`;
  return v.prerelease.length > 0 ? `${core}-${v.prerelease.join(".")}` : core;
}

function comparePrerelease(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1; // a release ranks above its prereleases
  if (b.length === 0) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d < 0 ? -1 : 1;
    } else if (xn !== yn) {
      return xn ? -1 : 1; // numeric identifiers rank below text ones
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

function asVersion(v: string | SemVer): SemVer {
  if (typeof v !== "string") return v;
  const parsed = parseVersion(v);
  if (!parsed) throw new Error(`Invalid version: "${v}"`);
  return parsed;
}

/** SemVer precedence: -1, 0 or 1. Throws on an invalid version string. */
export function compareVersions(a: string | SemVer, b: string | SemVer): -1 | 0 | 1 {
  const x = asVersion(a);
  const y = asVersion(b);
  for (const key of ["major", "minor", "patch"] as const) {
    if (x[key] !== y[key]) return x[key] < y[key] ? -1 : 1;
  }
  const p = comparePrerelease(x.prerelease, y.prerelease);
  return p === 0 ? 0 : p < 0 ? -1 : 1;
}

export type Channel = "alpha" | "beta" | "stable";

/** Major 0 is alpha. A "beta" prerelease tag is beta. Anything else from 1.0.0 is stable. */
export function channelOf(version: string | SemVer): Channel {
  const v = asVersion(version);
  if (v.major === 0) return "alpha";
  if (v.prerelease.some((p) => p.toLowerCase().startsWith("beta"))) return "beta";
  if (v.prerelease.some((p) => p.toLowerCase().startsWith("alpha"))) return "alpha";
  return "stable";
}

/** "v0.1.0 (alpha)" for display in the interface. */
export function displayVersion(version: string | SemVer): string {
  const v = asVersion(version);
  const channel = channelOf(v);
  return channel === "stable" ? `v${formatVersion(v)}` : `v${formatVersion(v)} (${channel})`;
}

export interface VersionInfo {
  readonly version: string;
  readonly channel: Channel;
  readonly display: string;
  readonly commit?: string;
  readonly builtAt?: string;
}

/** What the interface and the /version endpoint report. Commit and build date come from the build. */
export function versionInfo(version: string, build: { commit?: string; builtAt?: string } = {}): VersionInfo {
  const parsed = asVersion(version);
  return {
    version: formatVersion(parsed),
    channel: channelOf(parsed),
    display: displayVersion(parsed),
    ...(build.commit ? { commit: build.commit } : {}),
    ...(build.builtAt ? { builtAt: build.builtAt } : {}),
  };
}

export type UpdateDirection = "upgrade" | "same" | "downgrade";
export type UpdateNote = "backup_required" | "may_break_compatibility" | "skips_minor_versions" | "downgrade_unsupported" | "prerelease_target";

export interface UpdateAssessment {
  readonly from: string;
  readonly to: string;
  readonly direction: UpdateDirection;
  /** Number of minor versions skipped, within the same major. */
  readonly minorsSkipped: number;
  readonly notes: readonly UpdateNote[];
  /** False when the update must not be offered (a downgrade across versions). */
  readonly allowed: boolean;
}

/**
 * Judges an update from one installed version to a chosen target, for the self-hosted update tool.
 * A backup is always required. Upgrades in alpha (major 0) may break compatibility. Downgrades are not supported:
 * the way back is a restore of the backup taken before the update.
 */
export function assessUpdate(from: string, to: string): UpdateAssessment {
  const a = asVersion(from);
  const b = asVersion(to);
  const order = compareVersions(a, b);
  const direction: UpdateDirection = order === 0 ? "same" : order < 0 ? "upgrade" : "downgrade";
  const notes: UpdateNote[] = [];

  if (direction === "same") return { from: formatVersion(a), to: formatVersion(b), direction, minorsSkipped: 0, notes, allowed: true };
  if (direction === "downgrade") {
    return { from: formatVersion(a), to: formatVersion(b), direction, minorsSkipped: 0, notes: ["downgrade_unsupported"], allowed: false };
  }

  notes.push("backup_required");
  const sameMajor = a.major === b.major;
  const minorsSkipped = sameMajor ? Math.max(0, b.minor - a.minor - 1) : 0;
  if (a.major === 0 || !sameMajor) notes.push("may_break_compatibility");
  if (minorsSkipped > 0) notes.push("skips_minor_versions");
  if (b.prerelease.length > 0) notes.push("prerelease_target");
  return { from: formatVersion(a), to: formatVersion(b), direction, minorsSkipped, notes, allowed: true };
}
