/**
 * Mirrors listen-port parsing in the MCP server, catalog website, and
 * Connect sample.
 *
 * Open PRs #38/#39/#42 lock missing Stripe keys, empty Bearer tokens,
 * and listen() binding all interfaces. They do not lock that
 * parseInt(PORT) can be NaN / 0 / out of range and the process still
 * calls listen() — Node then throws ERR_SOCKET_BAD_PORT or binds a
 * random ephemeral port.
 */

export function parseListenPort(
  envValue: string | undefined,
  fallback: string
): number {
  return parseInt(envValue || fallback, 10);
}

export function isValidTcpPort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

export function productionRejectsInvalidListenPort(): boolean {
  return false;
}

export function connectPortFromEnv(
  envValue: string | undefined,
  fallback = 3000
): string | number {
  return envValue || fallback;
}
