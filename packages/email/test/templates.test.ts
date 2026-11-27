import { describe, expect, it } from "vitest";
import {
  assertLink, buildHeaders, cleanLabel, escapeHtml, formatMoment, renderInvitation, invitationMessage, renderReceipt, receiptMessage, renderSignIn, renderVerification,
  signInMessage, validateMessage, verificationMessage, type EmailLocale, type Rendered, type VerificationInput,
} from "../src/index.js";

const LOCALES: EmailLocale[] = ["fr", "en"];
const verification = (locale: EmailLocale, over: Partial<VerificationInput> = {}): VerificationInput => ({
  locale,
  organization: "Coopérative du Parc",
  poll: "Adoption du budget 2027",
  link: "https://qohesion.app/v/Zk3p9QxT",
  expiresAt: "2027-03-01T23:30:00Z",
  timeZone: "America/Toronto",
  stopUrl: "https://qohesion.app/stop/Aq81",
  ...over,
});

const withoutStop = (locale: EmailLocale): VerificationInput => {
  const { stopUrl: _omitted, ...rest } = verification(locale);
  return rest;
};

describe("formatMoment", () => {
  it("writes date, 24-hour time, zone name and zone identifier in the poll's zone", () => {
    expect(formatMoment("2027-03-01T23:30:00Z", "America/Toronto")).toBe("2027-03-01 18:30 EST (America/Toronto)");
    expect(formatMoment("2027-07-01T16:00:00Z", "America/Toronto")).toBe("2027-07-01 12:00 EDT (America/Toronto)");
  });

  it("uses 00 for midnight, not 24", () => {
    expect(formatMoment("2027-03-02T05:00:00Z", "America/Toronto")).toBe("2027-03-02 00:00 EST (America/Toronto)");
  });

  it("rejects a time without Z or an offset, which would be read in the server's zone", () => {
    expect(() => formatMoment("2027-03-01T18:30:00", "America/Toronto")).toThrow(/Z or an offset/);
    expect(() => formatMoment("2027-03-01", "UTC")).toThrow(/Z or an offset/);
    expect(formatMoment("2027-03-01T18:30:00-05:00", "America/Toronto")).toBe("2027-03-01 18:30 EST (America/Toronto)");
    expect(formatMoment("2027-03-01T23:30:00+0000", "America/Toronto")).toBe("2027-03-01 18:30 EST (America/Toronto)");
  });

  it("accepts a Date, and rejects an invalid date or zone", () => {
    expect(formatMoment(new Date("2027-03-01T05:05:00Z"), "UTC")).toMatch(/^2027-03-01 05:05 UTC \(UTC\)$/);
    expect(() => formatMoment("not a date", "UTC")).toThrow(/Z or an offset/);
    expect(() => formatMoment("2027-13-45T10:00:00Z", "UTC")).toThrow(/Invalid date/);
    expect(() => formatMoment("2027-03-01T05:05:00Z", "Mars/Olympus")).toThrow();
  });
});

describe("helpers", () => {
  it("cleans names that come from users", () => {
    expect(cleanLabel("  Coop\r\nBcc: x@y.zz \t du   Parc ")).toBe("Coop Bcc: x@y.zz du Parc");
    expect(cleanLabel("a".repeat(200), 20)).toBe(`${"a".repeat(19)}…`);
  });

  it("does not cut a pair of surrogates when shortening", () => {
    const text = `${"a".repeat(78)}\u{1F600}\u{1F600}\u{1F600}`;
    const out = cleanLabel(text, 80);
    expect(out).toBe(`${"a".repeat(78)}\u{1F600}…`);
    expect(out).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/); // no lone surrogate
  });

  it("removes characters that reorder or hide text: direction marks, isolates, zero-width characters, U+0085", () => {
    expect(cleanLabel("Coop\u202Eerutan\u202C du\u2066 Parc\u2069")).toBe("Cooperutan du Parc");
    expect(cleanLabel("a\u200Bb\u200Dc\uFEFFd\u00ADe")).toBe("abcde");
    expect(cleanLabel("a\u0085b")).toBe("a b");
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });

  it("accepts https links and a local address for development, and nothing else", () => {
    expect(assertLink("l", "https://qohesion.app/v/abc?x=1")).toBe("https://qohesion.app/v/abc?x=1");
    expect(assertLink("l", "http://localhost:5173/v/abc")).toBe("http://localhost:5173/v/abc");
    for (const bad of [
      "http://qohesion.app/v/abc", "javascript:alert(1)", "https://a.b/x y", 'https://a.b/"><script>', "//a.b/x", "https://",
      "https://qohesion.app@evil.example/", "https://user:pw@qohesion.app/x", "https://qohesion.app/\u202Egpj.exe", "https://qohesion.app/\u0000",
      "https://qohesion.app/caf\u00e9",
    ]) {
      expect(() => assertLink("l", bad)).toThrow(/must be an https address/);
    }
  });
});

describe("verification email", () => {
  it("states the poll, the organization, the effect, the deadline in the poll's zone and the next step (English)", () => {
    const r = renderVerification(verification("en"));
    expect(r.subject).toBe("Verification of an email address: Adoption du budget 2027");
    expect(r.text).toContain('the poll "Adoption du budget 2027", held by "Coopérative du Parc"');
    expect(r.text).toContain("registers this address on the roll of the poll (the list of addresses allowed to vote)");
    expect(r.text).toContain("The link does not record any choice.");
    expect(r.text).toContain("valid until 2027-03-01 18:30 EST (America/Toronto), single use");
    expect(r.text).toContain("If no verification was requested, no action is needed.");
    expect(r.text).toContain("https://qohesion.app/v/Zk3p9QxT");
  });

  it("states the same content in French", () => {
    const r = renderVerification(verification("fr"));
    expect(r.subject).toBe("Vérification d’une adresse courriel : Adoption du budget 2027");
    expect(r.text).toContain("du scrutin « Adoption du budget 2027 », tenu par « Coopérative du Parc »");
    expect(r.text).toContain("sur la liste des votants du scrutin (les adresses autorisées à voter)");
    expect(r.text).toContain("Le lien n’enregistre aucun choix.");
    expect(r.text).toContain("valide jusqu’au 2027-03-01 18:30 EST (America/Toronto), utilisable une seule fois");
    expect(r.text).toContain("Si aucune vérification n’a été demandée, aucune action n’est nécessaire.");
    expect(r.html).toContain('<html lang="fr">');
  });

  it("leaves out the stop line when no stop address is given", () => {
    for (const locale of LOCALES) {
      const r = renderVerification(withoutStop(locale));
      expect(r.text).not.toContain("/stop/");
      expect(r.html).not.toContain("/stop/");
    }
  });

  it("neutralizes line breaks and markup in the names", () => {
    const r = renderVerification(verification("en", { organization: 'A<script>alert(1)</script>', poll: "Vote\r\nBcc: x@y.zz" }));
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(r.subject).toBe("Verification of an email address: Vote Bcc: x@y.zz");
    expect(r.html).not.toContain("<script");
    expect(r.html).toContain("A&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("shortens very long names so the subject stays within the limit", () => {
    const r = renderVerification(verification("fr", { poll: "x".repeat(500) }));
    expect(r.subject.length).toBeLessThan(200);
  });

  it("refuses an unsafe link", () => {
    expect(() => renderVerification(verification("en", { link: "http://qohesion.app/v/x" }))).toThrow(/link must be/);
    expect(() => renderVerification(verification("en", { stopUrl: "javascript:x" }))).toThrow(/stopUrl must be/);
  });
});

describe("sign-in email", () => {
  it("states the effect, the validity and the instruction not to forward (English)", () => {
    const r = renderSignIn({ locale: "en", link: "https://qohesion.app/s/Tk9", validMinutes: 15 });
    expect(r.subject).toBe("Sign-in to Qohesion");
    expect(r.text).toContain("starts a session on the device that opens it");
    expect(r.text).toContain("must therefore not be forwarded");
    expect(r.text).toContain("valid 15 minutes, single use");
    expect(r.text).toContain("If no sign-in was requested, no action is needed.");
  });

  it("states the same content in French, with the singular for one minute", () => {
    const r = renderSignIn({ locale: "fr", link: "https://qohesion.app/s/Tk9", validMinutes: 1 });
    expect(r.subject).toBe("Connexion à Qohesion");
    expect(r.text).toContain("ouvre une session sur l’appareil qui l’ouvre");
    expect(r.text).toContain("ne doit donc pas être transmis");
    expect(r.text).toContain("valide 1 minute, utilisable une seule fois");
    expect(renderSignIn({ locale: "en", link: "https://qohesion.app/s/Tk9", validMinutes: 1 }).text).toContain("valid 1 minute,");
  });

  it("refuses an invalid validity or link", () => {
    expect(() => renderSignIn({ locale: "en", link: "https://qohesion.app/s/x", validMinutes: 0 })).toThrow(/validMinutes/);
    expect(() => renderSignIn({ locale: "en", link: "https://qohesion.app/s/x", validMinutes: 2.5 })).toThrow(/validMinutes/);
    expect(() => renderSignIn({ locale: "en", link: "ftp://x", validMinutes: 5 })).toThrow(/link must be/);
  });
});

const all = (): { name: string; r: Rendered }[] =>
  LOCALES.flatMap((locale) => [
    { name: `verification ${locale}`, r: renderVerification(verification(locale)) },
    { name: `sign-in ${locale}`, r: renderSignIn({ locale, link: "https://qohesion.app/s/Tk9", validMinutes: 15 }) },
  ]);

describe("functional register (docs/content-style.md)", () => {
  it("has no exclamation mark, in subject, text or HTML", () => {
    for (const { name, r } of all()) {
      expect(r.subject, name).not.toContain("!");
      expect(r.text, name).not.toContain("!");
      expect(r.html.replace("<!doctype html>", ""), name).not.toContain("!");
    }
  });

  it("does not address the reader as an individual", () => {
    const second = /\b(you|your|yours|yourself|vous|votre|vos|tu|ton|ta|tes|toi)\b/i;
    for (const { name, r } of all()) expect(r.text, name).not.toMatch(second);
  });

  it("uses no urgency, reassurance or enthusiasm words", () => {
    const loaded = /\b(urgent|immediately|hurry|don't worry|safe|secure|easy|simple|great|welcome|thank|bienvenue|merci|rapide|facile|sécuritaire|sécurisé|important)\b/i;
    for (const { name, r } of all()) expect(r.text, name).not.toMatch(loaded);
  });
});

describe("what the HTML must not contain", () => {
  it("has no image, script, form, embedded style sheet, remote font or web beacon", () => {
    for (const { name, r } of all()) {
      expect(r.html, name).not.toMatch(/<(img|script|iframe|form|link|style|object|embed|video|audio|svg)\b/i);
      expect(r.html, name).not.toMatch(/url\(/i);
      expect(r.html, name).not.toMatch(/@import/i);
    }
  });

  it("shows every link's address as its text, so the destination can be read", () => {
    for (const { name, r } of all()) {
      const anchors = [...r.html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
      expect(anchors.length, name).toBeGreaterThan(0);
      for (const [, href, text] of anchors) expect(text, name).toBe(href);
    }
  });

  it("carries the same links in text and HTML, and no others", () => {
    for (const { name, r } of all()) {
      const fromText = [...r.text.matchAll(/https:\/\/\S+/g)].map((m) => m[0]).sort();
      const fromHtml = [...r.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).sort();
      expect(fromHtml, name).toEqual(fromText);
    }
  });

  it("declares its language and a title, and keeps a plain-text body that ends with a line break", () => {
    for (const { name, r } of all()) {
      expect(r.html, name).toMatch(/<html lang="(fr|en)">/);
      expect(r.html, name).toMatch(/<title>[^<]+<\/title>/);
      expect(r.text.endsWith("\n"), name).toBe(true);
      expect(r.text.endsWith("\n\n"), name).toBe(false);
    }
  });
});

describe("ready-to-send messages", () => {
  const envelope = { from: { email: "noreply@qohesion.app", name: "Qohesion" }, to: { email: "member@example.org" } };

  it("builds a voting-lane verification message that passes the message checks", () => {
    const m = verificationMessage(verification("en"), envelope);
    expect(m.lane).toBe("voting");
    expect(validateMessage(m)).toEqual([]);
    expect(m.tags).toEqual(["verification"]);
  });

  it("uses the stop address as the one-click unsubscribe address", () => {
    const m = verificationMessage(verification("en"), envelope);
    const h = buildHeaders(m);
    expect(h["List-Unsubscribe"]).toBe("<https://qohesion.app/stop/Aq81>");
    expect(h["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("adds no unsubscribe header when there is no stop address", () => {
    const m = verificationMessage(withoutStop("fr"), envelope);
    expect(buildHeaders(m)).toEqual({});
  });

  it("builds a service-lane sign-in message that passes the message checks", () => {
    const m = signInMessage({ locale: "fr", link: "https://qohesion.app/s/Tk9", validMinutes: 15 }, envelope);
    expect(m.lane).toBe("service");
    expect(validateMessage(m)).toEqual([]);
    expect(m.tags).toEqual(["sign-in"]);
  });
});

describe("invitation email", () => {
  const base = {
    organization: "Maple Court",
    poll: "Budget 2027",
    link: "https://vote.example.org/v/ABCDEF",
    closesAt: "2026-12-12T20:00:00Z",
    timeZone: "America/Toronto",
    ballotStatement: "It is encrypted as soon as it is received.",
    resultsStatement: "Results are shown to the members when the poll closes.",
  } as const;

  it("states the link, the closing time, how the ballot is protected and who sees the results, in both languages", () => {
    for (const locale of ["en", "fr"] as const) {
      const r = renderInvitation({ ...base, locale });
      expect(r.text).toContain("https://vote.example.org/v/ABCDEF");
      expect(r.text).toContain("Budget 2027");
      expect(r.text).toContain(base.ballotStatement);
      expect(r.text).toContain(base.resultsStatement);
      expect(r.html).toContain('href="https://vote.example.org/v/ABCDEF"');
    }
    expect(renderInvitation({ ...base, locale: "en" }).text).toContain("closes on");
    expect(renderInvitation({ ...base, locale: "fr" }).text).toContain("ferme le");
  });

  it("leaves out the closing time when an administrator closes the poll, and has no image", () => {
    const r = renderInvitation({ ...base, locale: "en", closesAt: null });
    expect(r.text).not.toContain("closes on");
    expect(r.html).not.toContain("<img");
  });

  it("neutralises markup and header injection in names, and refuses a link that is not https", () => {
    const r = renderInvitation({ ...base, locale: "en", organization: "A<script>x</script>", poll: "Vote\r\nBcc: x@y.zz" });
    expect(r.html).not.toContain("<script>");
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(() => renderInvitation({ ...base, locale: "en", link: "javascript:alert(1)" })).toThrow();
  });

  it("says that a message is a reminder, in the subject and the first line", () => {
    const en = renderInvitation({ ...base, locale: "en", reminder: true });
    expect(en.subject).toBe("Reminder: Poll: Budget 2027");
    expect(en.text).toContain("Reminder: this poll is still open");
    const fr = renderInvitation({ ...base, locale: "fr", reminder: true });
    expect(fr.subject).toContain("Rappel");
    expect(renderInvitation({ ...base, locale: "en" }).subject).toBe("Poll: Budget 2027");
  });

  it("builds a voting-lane message", () => {
    const m = invitationMessage({ ...base, locale: "en" }, { from: { email: "noreply@qohesion.app" }, to: { email: "a@example.com" } });
    expect(m.lane).toBe("voting");
    expect(m.tags).toEqual(["invitation"]);
  });
});

describe("receipt email", () => {
  const base = { organization: "Maple Court", poll: "Budget 2027", code: "K7QM-39XD-82HT", checkLink: "https://vote.example.org/r/abc123", linksVoterToBallot: false } as const;

  it("gives the code and the public page that checks it, in both languages, with no personal link", () => {
    for (const locale of ["en", "fr"] as const) {
      const r = renderReceipt({ ...base, locale });
      expect(r.text).toContain("K7QM-39XD-82HT");
      expect(r.text).toContain("https://vote.example.org/r/abc123");
      expect(r.html).toContain('href="https://vote.example.org/r/abc123"');
      expect(r.html).not.toContain("<img");
      expect(r.text).not.toContain("/v/");
    }
    expect(renderReceipt({ ...base, locale: "fr" }).text).not.toMatch(/ [:;!?]/);
  });

  it("warns that address and code are tied together only where a secret poll publishes its ballots", () => {
    expect(renderReceipt({ ...base, locale: "en" }).text).not.toContain("ties this address");
    expect(renderReceipt({ ...base, locale: "en", linksVoterToBallot: true }).text).toContain("ties this address to this code");
    expect(renderReceipt({ ...base, locale: "fr", linksVoterToBallot: true }).text).toContain("associe donc cette adresse à ce code");
  });

  it("refuses a code of an unexpected form and a link that is not https, and builds a voting-lane message", () => {
    expect(() => renderReceipt({ ...base, locale: "en", code: "<b>x</b>" })).toThrow();
    expect(() => renderReceipt({ ...base, locale: "en", checkLink: "javascript:alert(1)" })).toThrow();
    const m = receiptMessage({ ...base, locale: "en" }, { from: { email: "noreply@qohesion.app" }, to: { email: "a@example.com" } });
    expect(m.lane).toBe("voting");
    expect(m.tags).toEqual(["receipt"]);
  });
});
