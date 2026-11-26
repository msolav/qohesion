/** Where the source of this build is published. */
export const UPSTREAM_SOURCE = "https://github.com/msolav/qohesion";

/**
 * The address shown in the footer as "Source code". The AGPL requires an operator who changes the software to offer the
 * changed source to users of the service, so an installation can point the link to its own copy with QOHESION_SOURCE_URL.
 * Only a plain https address is accepted; anything else falls back to the upstream repository.
 */
export function sourceUrl(configured: string | undefined): string {
  const value = (configured ?? "").trim();
  if (value === "") return UPSTREAM_SOURCE;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return UPSTREAM_SOURCE;
    return url.href;
  } catch {
    return UPSTREAM_SOURCE;
  }
}
