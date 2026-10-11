/**
 * Mirrors MCP HTTP dispatch in src/index.ts.
 *
 * Open PRs #37/#38/#42 lock plaintext HTTP, empty MCP_API_KEY, and
 * listen() binding every interface. They do not lock that the request
 * handler never reads Host. After DNS rebinding, a page served from an
 * attacker hostname that later resolves to this process can POST
 * JSON-RPC as a same-origin request; the Host header is the attacker
 * name and production does not compare it to an allowlist.
 */

export const MCP_HOST_HEADER_MARKERS = [
  'req.headers.host',
  "req.headers['host']",
  'req.headers["host"]',
  'allowedHosts',
  'ALLOWED_HOSTS',
] as const;

export function sourceValidatesRequestHost(source: string): boolean {
  return MCP_HOST_HEADER_MARKERS.some((marker) => source.includes(marker));
}

export function hostIsAllowed(
  hostHeader: string | string[] | undefined,
  allowlist: readonly string[]
): boolean {
  if (typeof hostHeader !== 'string') {
    return false;
  }
  const hostname = hostHeader.split(':')[0]?.toLowerCase() ?? '';
  return allowlist.some((allowed) => allowed.toLowerCase() === hostname);
}

export function productionValidatesRequestHost(): boolean {
  return false;
}
