// SPDX-FileCopyrightText: 2026 Qohesion contributors
// SPDX-License-Identifier: AGPL-3.0-or-later

/** The running test edition: one database and one server secret in the data folder (ADR 0007). */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { QOHESION_DATA_DIR, QOHESION_EDITION, QOHESION_GATE_PASSWORD } from "$app/env/private";
import { Service } from "./service.js";
import { runAutoReminders } from "./reminders.js";

let instance: Service | undefined;
let secret: Uint8Array | undefined;

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
    instance = Service.open(path.join(QOHESION_DATA_DIR, "qohesion.sqlite"), { secret: serverSecret() });
    startReminderTimer();
  }
  return instance;
}

export function serverSecret(): Uint8Array {
  secret ??= loadSecret(QOHESION_DATA_DIR);
  return secret;
}

/** The password in front of the test edition, or an empty string when there is none. */
export function gatePassword(): string {
  return isTestEdition() ? QOHESION_GATE_PASSWORD : "";
}

/** Looks for reminders that are due every ten minutes, once the server is running. It never keeps the process alive. */
function startReminderTimer(): void {
  const origin = (process.env["ORIGIN"] ?? "").replace(/\/$/, "");
  const timer = setInterval(() => {
    void runAutoReminders(origin).catch((error: unknown) => console.error("Automatic reminders failed:", error instanceof Error ? error.message : error));
  }, 10 * 60_000);
  timer.unref();
}
