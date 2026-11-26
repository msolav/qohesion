import { describe, expect, it } from "vitest";
import {
  assertLink, buildHeaders, cleanLabel, escapeHtml, formatMoment, renderSignIn, renderVerification,
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

  it("accepts a Date, and rejects an invalid date or zone", () => {
    expect(formatMoment(new Date("2027-03-01T05:05:00Z"), "UTC")).toMatch(/^2027-03-01 05:05 UTC \(UTC\)$/);
    expect(() => formatMoment("not a date", "UTC")).toThrow(/Invalid date/);
    expect(() => formatMoment("2027-03-01T05:05:00Z", "Mars/Olympus")).toThrow();
  });
});

describe("helpers", () => {
  it("cleans names that come from users", () => {
    expect(cleanLabel("  Coop\r\nBcc: x@y.zz \t du   Parc ")).toBe("Coop Bcc: x@y.zz du Parc");
    expect(cleanLabel("a".repeat(200), 20)).toBe(`${"a".repeat(19)}…`);
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  });

  it("accepts https links and a local address for development, and nothing else", () => {
    expect(assertLink("l", "https://qohesion.app/v/abc?x=1")).toBe("https://qohesion.app/v/abc?x=1");
    expect(assertLink("l", "http://localhost:5173/v/abc")).toBe("http://localhost:5173/v/abc");
    for (const bad of ["http://qohesion.app/v/abc", "javascript:alert(1)", "https://a.b/x y", 'https://a.b/"><script>', "//a.b/x", "https://"]) {
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
