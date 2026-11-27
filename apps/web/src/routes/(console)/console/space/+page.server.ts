import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { DEFAULT_THEME, isTheme } from "#lib/theme.js";
import { isLocale } from "#lib/i18n/negotiate.js";
import { service } from "#lib/server/runtime.js";
import { DEFAULT_TIME_ZONE, TIME_ZONES, isTimeZone } from "#lib/zoned.js";
import { SESSION_COOKIE, needSession } from "#lib/server/web.js";

const text = (data: FormData | undefined, name: string): string => {
  const value = data?.get(name);
  return typeof value === "string" ? value : "";
};

export const load: PageServerLoad = ({ locals }) => {
  const session = needSession(locals);
  if (!session.owner) redirect(303, "/console/polls");
  const space = service().getSpace(session.spaceId);
  return { space, keys: service().listKeys(session), currentKey: session.keyId, timeZones: TIME_ZONES };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const space = service().getSpace(session.spaceId);
    const locale = text(data, "language");
    const theme = text(data, "theme");
    const result = service().updateSpace(session, { name: text(data, "name"), locale: isLocale(locale) ? locale : (space?.locale ?? "fr"), theme: isTheme(theme) ? theme : (space?.theme ?? DEFAULT_THEME), timeZone: isTimeZone(text(data, "timeZone")) ? text(data, "timeZone") : (space?.timeZone ?? DEFAULT_TIME_ZONE) });
    if (!result.ok) return fail(400, { form: "save" as const, error: result.error });
    return { saved: true as const };
  },
  addKey: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const roles = data?.getAll("role") ?? [];
    const result = service().createKey(session, { label: text(data, "label"), owner: roles.includes("owner"), administrator: roles.includes("administrator") });
    if (!result.ok) return fail(400, { form: "key" as const, error: result.error, label: text(data, "label") });
    return { newKey: result.value.key, newKeyLabel: text(data, "label").trim() };
  },
  revoke: async ({ request, locals }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const result = service().revokeKey(session, text(data, "key"));
    if (!result.ok) return fail(400, { form: "revoke" as const, error: result.error });
    return { revoked: true as const };
  },
  deleteSpace: async ({ request, locals, cookies }) => {
    const session = needSession(locals);
    const data = await request.formData().catch(() => undefined);
    const result = service().deleteSpace(session, text(data, "confirm"));
    if (!result.ok) return fail(400, { form: "delete" as const, error: result.error });
    cookies.delete(SESSION_COOKIE, { path: "/" });
    redirect(303, "/start");
  },
};
