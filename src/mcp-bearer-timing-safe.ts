/**
 * Mirrors MCP Bearer comparison in src/index.ts validateAuth.
 *
 * Open PRs #3/#38 lock missing/empty/duplicate Authorization headers
 * and case-sensitive "Bearer". They do not lock that the token is
 * compared with === rather than crypto.timingSafeEqual, so a remote
 * client can statistically recover MCP_API_KEY from response timing.
 */

export function validateAuthLoose(
  authHeader: string | undefined,
  apiKey: string
): boolean {
  if (!authHeader) {
    return false;
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') {
    return false;
  }
  return token === apiKey;
}

export function sourceUsesTimingSafeEqual(source: string): boolean {
  return source.includes('timingSafeEqual');
}

export function productionUsesTimingSafeBearerCompare(): boolean {
  return false;
}
