// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

import { describe, expect, it } from "vitest";
import { DEFAULT_DISCLOSURE, maskEmail, maskName, readDisclosure, showsNobody, signatoryLabel, type Disclosure } from "./disclosure.js";

describe("maskName", () => {
  it("keeps the first name and the first letter of the rest", () => {
    expect(maskName("Marie Tremblay")).toBe("Marie T***");
    expect(maskName("Jean de la Cruz")).toBe("Jean d***");
    expect(maskName("  Marie   Tremblay ")).toBe("Marie T***");
  });
  it("hides all but the first letter of a name of one word", () => {
    expect(maskName("Marie")).toBe("M***");
  });
  it("does not follow the length of the name, and keeps accented letters whole", () => {
    expect(maskName("Éloïse Ö")).toBe("Éloïse Ö***");
    expect(maskName("Ann Li")).toBe(maskName("Ann Lindqvist-Olofsson"));
  });
  it("shows nothing for an empty name", () => {
    expect(maskName("   ")).toBe("");
  });
});

describe("maskEmail", () => {
  it("keeps the first and last letters of the name and of the host, and the ending", () => {
    expect(maskEmail("marie.tremblay@example.org")).toBe("m***y@e***e.org");
    expect(maskEmail("jean@mail.example.co.uk")).toBe("j***n@m***o.uk");
  });
  it("shows the first letter only of a part of two letters or fewer", () => {
    expect(maskEmail("a@b.co")).toBe("a***@b***.co");
    expect(maskEmail("ab@cd.org")).toBe("a***@c***.org");
  });
  it("is the same length whatever the address, so the length tells nothing beyond its ends", () => {
    expect(maskEmail("abc@xyz.org")).toHaveLength(maskEmail("abcdefghijkl@xyzuvwabcdef.org").length);
  });
  it("hides what is not an address", () => {
    expect(maskEmail("nonsense")).toBe("***");
  });
});

describe("signatoryLabel", () => {
  const entry = { name: "Marie Tremblay", address: "marie.tremblay@example.org" };
  const label = (d: Disclosure, e: { name: string | null; address: string } = entry) => signatoryLabel(e, d);

  it("covers every pair of modes", () => {
    expect(label({ name: "full", email: "full" })).toBe("Marie Tremblay <marie.tremblay@example.org>");
    expect(label({ name: "full", email: "masked" })).toBe("Marie Tremblay <m***y@e***e.org>");
    expect(label({ name: "full", email: "none" })).toBe("Marie Tremblay");
    expect(label({ name: "masked", email: "full" })).toBe("Marie T*** <marie.tremblay@example.org>");
    expect(label({ name: "masked", email: "masked" })).toBe("Marie T*** <m***y@e***e.org>");
    expect(label({ name: "masked", email: "none" })).toBe("Marie T***");
    expect(label({ name: "none", email: "full" })).toBe("marie.tremblay@example.org");
    expect(label({ name: "none", email: "masked" })).toBe("m***y@e***e.org");
    expect(label({ name: "none", email: "none" })).toBe("—");
  });
  it("shows the address alone for an entry without a name", () => {
    expect(label({ name: "full", email: "masked" }, { name: null, address: "a.b@example.org" })).toBe("a***b@e***e.org");
  });
  it("shows a dash for an entry with no name when addresses are not shown", () => {
    expect(label({ name: "full", email: "none" }, { name: null, address: "a.b@example.org" })).toBe("—");
  });
});

describe("readDisclosure", () => {
  it("reads a stored value and falls back to the default for anything else", () => {
    expect(readDisclosure('{"name":"masked","email":"none"}')).toEqual({ name: "masked", email: "none", reference: "none" });
    expect(readDisclosure({ name: "full", email: "full", reference: "masked" })).toEqual({ name: "full", email: "full", reference: "masked" });
    expect(readDisclosure("not json")).toEqual(DEFAULT_DISCLOSURE);
    expect(readDisclosure({ name: "everything", email: 3 })).toEqual(DEFAULT_DISCLOSURE);
    expect(readDisclosure(null)).toEqual(DEFAULT_DISCLOSURE);
  });
  it("tells when a list shows nobody", () => {
    expect(showsNobody({ name: "none", email: "none" })).toBe(true);
    expect(showsNobody({ name: "none", email: "masked" })).toBe(false);
  });
});
