// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { mayReachJunk } from "./junk-domains.js";

describe("mayReachJunk", () => {
  it("flags the providers that filed the test messages as junk", () => {
    for (const a of ["a@outlook.com", "b@Hotmail.com", "c@yahoo.ca", "d@aol.com", "e@gmx.de", "f@icloud.com"]) expect(mayReachJunk(a)).toBe(true);
  });
  it("does not flag the providers that delivered them", () => {
    for (const a of ["a@gmail.com", "b@yandex.ru", "c@free.fr", "d@example.org", "nope"]) expect(mayReachJunk(a)).toBe(false);
  });
});
