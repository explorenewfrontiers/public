/**
 * Mirrors catalog CORS in src/web-server.ts:
 *   app.use(cors());
 *
 * Open PR #24 locks that cors() has no origin allowlist and that
 * /api/checkout has no auth. It does not lock Access-Control-Allow-
 * Credentials or the default cors() header contract: ACAO is `*` and
 * credentials are off. A later `cors({ credentials: true })` without
 * an origin allowlist would let any site read checkout session IDs
 * with cookies. Origin: null (sandboxed iframe / data: page) is also
 * accepted under the default `*` policy.
 */

export const CATALOG_CHECKOUT_PATH = '/api/checkout';

export function sourceEnablesCorsCredentials(source: string): boolean {
  return (
    source.includes('Access-Control-Allow-Credentials') ||
    source.includes('credentials: true') ||
    source.includes('credentials:true')
  );
}

export function sourceUsesDefaultCorsCall(source: string): boolean {
  return /app\.use\(\s*cors\(\)\s*\)/.test(source);
}

export function productionSetsCorsCredentials(): boolean {
  return false;
}
