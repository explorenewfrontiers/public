/**
 * MCP HTTP Bearer auth.
 * An empty MCP_API_KEY must not enable authentication: Docker Compose
 * interpolates unset variables as "", which would otherwise treat
 * `Authorization: Bearer ` as a valid credential.
 */
export function isMcpAuthEnabled(apiKey: string | undefined): boolean {
  return typeof apiKey === 'string' && apiKey.length > 0;
}

export function validateBearerAuth(
  authHeader: string | undefined,
  apiKey: string | undefined
): boolean {
  if (!isMcpAuthEnabled(apiKey)) {
    return true;
  }

  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') {
    return false;
  }

  return token === apiKey;
}
