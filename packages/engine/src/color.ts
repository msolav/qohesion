/** WCAG 2.x contrast helpers. Colours are "#rrggbb". */

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function toHex(values: readonly number[]): string {
  return "#" + values.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function mix(hex: string, target: number, amount: number): string {
  return toHex(channels(hex).map((v) => v + (target - v) * amount));
}

export interface Adjusted {
  readonly color: string;
  readonly ratio: number;
  readonly adjusted: boolean;
  /** False when no colour of this hue could reach the ratio. */
  readonly met: boolean;
}

/**
 * Returns the colour closest to the requested one that reaches the contrast ratio against a background.
 * Darkens first, then lightens, in small steps, so the hue is kept.
 */
export function adjustForContrast(hex: string, against: string, minRatio: number): Adjusted {
  const upper = hex.toUpperCase();
  const start = contrastRatio(upper, against);
  if (start >= minRatio) return { color: upper, ratio: start, adjusted: false, met: true };
  for (const target of [0, 255]) {
    for (let step = 1; step <= 25; step++) {
      const candidate = mix(upper, target, step * 0.04);
      const ratio = contrastRatio(candidate, against);
      if (ratio >= minRatio) return { color: candidate, ratio, adjusted: true, met: true };
    }
  }
  const black = contrastRatio("#000000", against);
  const white = contrastRatio("#FFFFFF", against);
  const best = black >= white ? "#000000" : "#FFFFFF";
  return { color: best, ratio: Math.max(black, white), adjusted: true, met: false };
}
