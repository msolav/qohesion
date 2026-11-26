import type { Address, EmailMessage } from "./types.js";

/**
 * Text of the two emails that the service sends before an account or a vote exists: the verification of a member's
 * address, and the administrator's sign-in link. Written in the functional register of docs/content-style.md:
 * descriptive, impersonal, no emotion, terms defined where they first appear, what happens next stated.
 *
 * The HTML part carries no image, no script and no tracking. Every link shows its full address as its text, so that
 * the destination can be read before opening it.
 */

export type EmailLocale = "fr" | "en";

const NBSP = "\u00a0";

/** Collapses whitespace and control characters, then shortens. Used for names that come from users. */
export function cleanLabel(value: string, max = 120): string {
  const flat = value
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ") // control characters, including line breaks and U+0085
    .replace(/[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]/g, "") // zero-width and direction-changing characters
    .replace(/\s+/g, " ")
    .trim();
  const letters = Array.from(flat); // by code point, so that a pair of surrogates is never cut in two
  return letters.length <= max ? flat : `${letters.slice(0, max - 1).join("").trimEnd()}…`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const SAFE_LINK = /^https:\/\/[^\s<>"'\\]+$/;
const LOCAL_LINK = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s<>"'\\]*)?$/;

/** Links are https, with no user name or password and only printable ASCII. A local address over http is accepted for development. */
export function assertLink(label: string, value: string): string {
  if (!SAFE_LINK.test(value) && !LOCAL_LINK.test(value)) throw new Error(`${label} must be an https address`);
  if (!/^[\x21-\x7e]+$/.test(value)) throw new Error(`${label} must be an https address`);
  // "https://qohesion.app@evil.example/" reads like qohesion.app but goes to evil.example.
  const authority = value.replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0] ?? "";
  if (authority === "" || authority.includes("@")) throw new Error(`${label} must be an https address`);
  return value;
}

/** "2027-03-01 18:30 EST (America/Toronto)". The same form in every language. */
export function formatMoment(at: Date | string, timeZone: string): string {
  // A time without Z or an offset would be read in the server's zone, and print a different hour on another server.
  if (typeof at === "string" && !/(Z|[+-]\d{2}:?\d{2})$/i.test(at)) throw new Error("A time needs Z or an offset");
  const date = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} ${get("timeZoneName")} (${timeZone})`;
}

export interface Rendered {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

interface Block {
  /** Plain paragraph. */
  readonly p?: string;
  /** A link on its own line, preceded by a label. */
  readonly link?: { readonly label: string; readonly url: string };
  /** Heading. */
  readonly h?: string;
  /** Final note, set apart. */
  readonly note?: string;
}

function toText(blocks: readonly Block[]): string {
  return blocks
    .map((b) => (b.h ?? b.p ?? b.note ?? (b.link ? `${b.link.label}\n${b.link.url}` : "")))
    .join("\n\n")
    .concat("\n");
}

const STYLE = {
  body: "margin:0;padding:24px;background:#ffffff;color:#1b1b1b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;",
  wrap: "max-width:34em;margin:0 auto;",
  h: "margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;",
  p: "margin:0 0 16px;",
  link: "margin:0 0 16px;word-break:break-all;",
  note: "margin:24px 0 0;padding-top:16px;border-top:1px solid #d6d6d6;font-size:14px;color:#4a4a4a;",
};

function toHtml(locale: EmailLocale, title: string, blocks: readonly Block[]): string {
  const body = blocks
    .map((b) => {
      if (b.h !== undefined) return `<h1 style="${STYLE.h}">${escapeHtml(b.h)}</h1>`;
      if (b.link) {
        const u = escapeHtml(b.link.url);
        return `<p style="${STYLE.p}margin-bottom:4px;">${escapeHtml(b.link.label)}</p>\n<p style="${STYLE.link}"><a href="${u}" style="color:#0b4fb3;">${u}</a></p>`;
      }
      if (b.note !== undefined) return `<p style="${STYLE.note}">${escapeHtml(b.note)}</p>`;
      return `<p style="${STYLE.p}">${escapeHtml(b.p ?? "")}</p>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="${STYLE.body}">
<div style="${STYLE.wrap}">
${body}
</div>
</body>
</html>
`;
}

function assemble(locale: EmailLocale, subject: string, blocks: readonly Block[]): Rendered {
  return { subject, text: toText(blocks), html: toHtml(locale, subject, blocks) };
}

// --- Verification of a member's address ------------------------------------------------------------------------------

export interface VerificationInput {
  readonly locale: EmailLocale;
  /** Name of the organization that holds the poll. */
  readonly organization: string;
  /** Title of the poll or vote. */
  readonly poll: string;
  /** Single-use link that registers the address. */
  readonly link: string;
  /** When the link stops working. */
  readonly expiresAt: Date | string;
  /** IANA time zone of the poll, for example "America/Toronto". */
  readonly timeZone: string;
  /** One-click address that stops further verification emails to this address. */
  readonly stopUrl?: string;
}

export function renderVerification(input: VerificationInput): Rendered {
  const org = cleanLabel(input.organization, 80);
  const poll = cleanLabel(input.poll, 100);
  const link = assertLink("link", input.link);
  const stop = input.stopUrl === undefined ? undefined : assertLink("stopUrl", input.stopUrl);
  const until = formatMoment(input.expiresAt, input.timeZone);

  if (input.locale === "fr") {
    const blocks: Block[] = [
      { h: "Vérification d’une adresse courriel" },
      { p: `Une vérification de cette adresse a été demandée sur la page d’inscription du scrutin «${NBSP}${poll}${NBSP}», tenu par «${NBSP}${org}${NBSP}».` },
      { p: "Effet : l’ouverture du lien ci-dessous inscrit cette adresse sur la liste des votants du scrutin (les adresses autorisées à voter). L’inscription est nécessaire pour voter. Le lien n’enregistre aucun choix." },
      { link: { label: `Lien de vérification (valide jusqu’au ${until}, utilisable une seule fois)${NBSP}:`, url: link } },
      { p: "Si aucune vérification n’a été demandée, aucune action n’est nécessaire. L’adresse n’est pas inscrite tant que le lien n’est pas ouvert." },
      ...(stop ? [{ link: { label: `Pour ne plus recevoir de courriel de vérification à cette adresse${NBSP}:`, url: stop } }] : []),
      { note: "Ce message automatique est envoyé par le service Qohesion au nom de l’organisateur du scrutin. Les réponses ne sont pas lues." },
    ];
    return assemble("fr", `Vérification d’une adresse courriel${NBSP}: ${poll}`, blocks);
  }

  const blocks: Block[] = [
    { h: "Verification of an email address" },
    { p: `A verification of this address was requested on the registration page of the poll "${poll}", held by "${org}".` },
    { p: "Effect: opening the link below registers this address on the roll of the poll (the list of addresses allowed to vote). Registration is required to vote. The link does not record any choice." },
    { link: { label: `Verification link (valid until ${until}, single use):`, url: link } },
    { p: "If no verification was requested, no action is needed. The address is not registered unless the link is opened." },
    ...(stop ? [{ link: { label: "To stop receiving verification emails at this address:", url: stop } }] : []),
    { note: "This automated message is sent by the Qohesion service on behalf of the organizer of the poll. Replies are not read." },
  ];
  return assemble("en", `Verification of an email address: ${poll}`, blocks);
}

// --- Administrator sign-in ------------------------------------------------------------------------------------------

export interface SignInInput {
  readonly locale: EmailLocale;
  readonly link: string;
  /** Validity of the link, in minutes. */
  readonly validMinutes: number;
}

export function renderSignIn(input: SignInInput): Rendered {
  const link = assertLink("link", input.link);
  if (!Number.isInteger(input.validMinutes) || input.validMinutes < 1) throw new Error("validMinutes must be a positive integer");
  const minutes = input.validMinutes;

  if (input.locale === "fr") {
    const blocks: Block[] = [
      { h: "Connexion à Qohesion" },
      { p: "Une connexion à Qohesion a été demandée pour le compte d’administration associé à cette adresse courriel." },
      { p: "Effet : l’ouverture du lien ci-dessous ouvre une session sur l’appareil qui l’ouvre. Toute personne qui possède le lien peut ouvrir la session, tant que le lien n’a pas été utilisé et qu’il n’est pas expiré. Le lien ne doit donc pas être transmis." },
      { link: { label: `Lien de connexion (valide ${minutes}${NBSP}${minutes === 1 ? "minute" : "minutes"}, utilisable une seule fois)${NBSP}:`, url: link } },
      { p: "Si aucune connexion n’a été demandée, aucune action n’est nécessaire. Aucune session n’est ouverte tant que le lien n’est pas ouvert." },
      { note: "Ce message automatique est envoyé par le service Qohesion. Les réponses ne sont pas lues." },
    ];
    return assemble("fr", "Connexion à Qohesion", blocks);
  }

  const blocks: Block[] = [
    { h: "Sign-in to Qohesion" },
    { p: "A sign-in to Qohesion was requested for the administrator account associated with this email address." },
    { p: "Effect: opening the link below starts a session on the device that opens it. Anyone who has the link can start the session until the link is used or expires. The link must therefore not be forwarded." },
    { link: { label: `Sign-in link (valid ${minutes} ${minutes === 1 ? "minute" : "minutes"}, single use):`, url: link } },
    { p: "If no sign-in was requested, no action is needed. No session starts unless the link is opened." },
    { note: "This automated message is sent by the Qohesion service. Replies are not read." },
  ];
  return assemble("en", "Sign-in to Qohesion", blocks);
}

// --- Ready-to-send messages ------------------------------------------------------------------------------------------

export interface MessageEnvelope {
  readonly from: Address;
  readonly to: Address;
  readonly replyTo?: Address;
}

/** A verification email for the voting lane. When `stopUrl` is given it also becomes the one-click unsubscribe address. */
export function verificationMessage(input: VerificationInput, envelope: MessageEnvelope): EmailMessage {
  const r = renderVerification(input);
  return {
    lane: "voting", ...envelope, subject: r.subject, text: r.text, html: r.html, tags: ["verification"],
    ...(input.stopUrl === undefined ? {} : { unsubscribeUrl: input.stopUrl }),
  };
}

/** A sign-in email for the service lane. */
export function signInMessage(input: SignInInput, envelope: MessageEnvelope): EmailMessage {
  const r = renderSignIn(input);
  return { lane: "service", ...envelope, subject: r.subject, text: r.text, html: r.html, tags: ["sign-in"] };
}
