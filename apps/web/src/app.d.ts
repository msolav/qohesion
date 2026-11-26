import type { Locale } from "#lib/i18n/negotiate.js";
import type { Theme } from "#lib/theme.js";

declare global {
  namespace App {
    interface Locals {
      locale: Locale;
      theme: Theme;
    }
  }

  /** Set at build time from the VERSION file, the current commit and the clock (see vite.config.ts). */
  const __QOHESION_VERSION__: string;
  const __QOHESION_COMMIT__: string;
  const __QOHESION_BUILT_AT__: string;
}

export {};
