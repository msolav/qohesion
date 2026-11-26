import type { Handle } from "@sveltejs/kit/hooks";
import { isLocale, negotiateLocale } from "#lib/i18n/negotiate.js";
import { themeFrom } from "#lib/theme.js";

const YEAR = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
  const query = event.url.searchParams.get("lang");
  const remembered = event.cookies.get("lang");
  const locale = negotiateLocale({ query, cookie: remembered, acceptLanguage: event.request.headers.get("accept-language") });

  // The choice made with the language switcher is kept in a functional cookie: no identifier, no tracking.
  if (isLocale(query) && remembered !== query) {
    event.cookies.set("lang", query, { path: "/", maxAge: YEAR, sameSite: "lax", httpOnly: true });
  }

  event.locals.locale = locale;
  event.locals.theme = themeFrom(event.url.searchParams.get("theme"));

  event.setHeaders({
    vary: "Accept-Language, Cookie",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  });

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", event.locals.locale).replace("%theme%", event.locals.theme),
  });
};
