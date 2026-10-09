/**
 * Mirrors MCP Bearer parsing in src/index.ts validateAuth.
 *
 * Open PRs #3/#38 lock missing/empty/duplicate Authorization headers
 * and a case-sensitive "Bearer" scheme. Open PR #46 locks === vs
 * timingSafeEqual. They do not lock that the header is split on a
 * single ASCII space, so extra whitespace between scheme and token
 * (`Bearer  token`, tabs) yields an empty or undefined token and
 * rejects a valid MCP_API_KEY.
 */

export function validateAuthSingleSpaceSplit(
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

export function productionSplitsAuthorizationOnSingleSpace(
  source: string
): boolean {
  return (
    source.includes("authHeader.split(' ')") &&
    !source.includes('split(/\\s+/)') &&
    !source.includes("split(/ +/)")
  );
}
