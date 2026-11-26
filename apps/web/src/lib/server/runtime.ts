// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/** The running test edition: one database and one server secret in the data folder (ADR 0007). */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { QOHESION_DATA_DIR, QOHESION_EDITION } from "$app/env/private";
import { Service } from "./service.js";

let instance: Service | undefined;

export function isTestEdition(): boolean {
  return QOHESION_EDITION === "test";
}

/** The secret is created on first start and kept in a private file. Losing it makes personal links stop working. */
export function loadSecret(dir: string): Uint8Array {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "secret");
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
  }
  chmodSync(file, 0o600);
  return Uint8Array.from(Buffer.from(readFileSync(file, "utf8").trim(), "hex"));
}

/** The service of the test edition. Throws when the edition is not enabled, so no route can use it by mistake. */
export function service(): Service {
  if (!isTestEdition()) throw new Error("The test edition is not enabled (QOHESION_EDITION=test)");
  if (!instance) {
    instance = Service.open(path.join(QOHESION_DATA_DIR, "qohesion.sqlite"), { secret: loadSecret(QOHESION_DATA_DIR) });
  }
  return instance;
}
