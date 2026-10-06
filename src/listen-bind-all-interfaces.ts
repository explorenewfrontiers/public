/**
 * Mirrors HTTP listen() calls in the MCP server, catalog website, and
 * Connect sample.
 *
 * Open PRs #37/#38 lock that MCP is http.createServer (no TLS/CORS) and
 * that empty MCP_API_KEY still enables auth. They do not lock that
 * listen(port) omits a host, so Node binds all interfaces (0.0.0.0 / ::)
 * and a LAN or container-adjacent client can reach money tools without
 * being on localhost.
 */

export const LISTEN_SOURCES = [
  'src/index.ts',
  'src/web-server.ts',
  'stripe-connect-sample/server.ts',
] as const;

export function listenSpecifiesLoopbackHost(source: string): boolean {
  return /listen\(\s*[^,)\s]+\s*,\s*['"](?:127\.0\.0\.1|localhost|::1)['"]/.test(
    source
  );
}

export function productionListenSpecifiesHost(): boolean {
  return false;
}
