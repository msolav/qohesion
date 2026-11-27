import type { Handle } from "@sveltejs/kit/hooks";
import { isLocale, negotiateLocale, pollLocale } from "#lib/i18n/negotiate.js";
import { themeFrom, isTheme } from "#lib/theme.js";
import { isTestEdition, service, gatePassword, serverSecret } from "#lib/server/runtime.js";
import { gateAllows, gateCookieValue, passwordMatches } from "#lib/server/gate.js";

const YEAR = 60 * 60 * 24 * 365;

/** The owner and administrator screens wear the console look, not a ballot template: no template rule may reach them. */
function consoleScreen(pathname: string): boolean {
  return pathname === "/start" || pathname === "/signin" || pathname === "/gate" || pathname === "/console" || pathname.startsWith("/console/");
}

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
  event.locals.session = null;

  const password = gatePassword();
  if (password && !gateAllows(event.url.pathname)) {
    const proof = event.cookies.get("qg");
    if (!proof || !passwordMatches(proof, gateCookieValue(serverSecret(), password))) {
      const next = `${event.url.pathname}${event.url.search}`;
      return new Response(null, { status: 303, headers: { location: `/gate?next=${encodeURIComponent(next)}`, "cache-control": "no-store" } });
    }
  }

  if (isTestEdition()) {
    const sessionToken = event.cookies.get("qs");
    if (sessionToken) event.locals.session = service().session(sessionToken);
    // A poll's screens use the template its administrators chose, unless the address names one.
    const named = event.url.searchParams.get("theme");
    const voter = /^\/v\/([^/]+)/.exec(event.url.pathname);
    const results = /^\/r\/([^/]+)/.exec(event.url.pathname);
    const poll = voter?.[1] ? service().byToken(voter[1])?.poll : results?.[1] ? service().getPoll(results[1]) : undefined;
    if (poll && !isTheme(named)) event.locals.theme = poll.theme;
    // The screens of a poll are in the language of the browser when the poll offers it, else in the poll's fallback language.
    if (poll) event.locals.locale = pollLocale(poll.translations.languages, { query, cookie: remembered, acceptLanguage: event.request.headers.get("accept-language") }) ?? event.locals.locale;
  }

  event.setHeaders({
    vary: "Accept-Language, Cookie",
    "x-content-type-options": "nosniff",
    // "same-origin", not "no-referrer": a browser sends "Origin: null" with a form post under no-referrer, and the framework's
    // cross-site check then refuses the post. Nothing is sent to other sites either way, so personal links do not leak.
    "referrer-policy": "same-origin",
    "x-frame-options": "DENY",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  });

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", event.locals.locale).replace("%theme%", consoleScreen(event.url.pathname) ? "console" : event.locals.theme),
  });
};
