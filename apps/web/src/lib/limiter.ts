// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Counts attempts per key over a sliding window, to slow down guessing of keys. Kept in memory: a restart clears it. */
export function createLimiter(options: { max: number; windowMs: number; now?: () => number }) {
  const now = options.now ?? Date.now;
  const attempts = new Map<string, number[]>();
  return {
    /** Records an attempt and says whether it is allowed. */
    hit(key: string): boolean {
      const t = now();
      const recent = (attempts.get(key) ?? []).filter((at) => t - at < options.windowMs);
      if (recent.length >= options.max) {
        attempts.set(key, recent);
        return false;
      }
      recent.push(t);
      attempts.set(key, recent);
      // Keep the table small: drop keys with nothing recent.
      if (attempts.size > 5000) for (const [k, list] of attempts) if (list.every((at) => t - at >= options.windowMs)) attempts.delete(k);
      return true;
    },
  };
}
