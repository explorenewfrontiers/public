/**
 * Express sends X-Powered-By: Express unless the app disables it.
 * Catalog and Connect never call app.disable('x-powered-by') or helmet,
 * so scanners can fingerprint the stack. MCP uses http.createServer and
 * does not emit that header.
 *
 * Open coverage PRs lock CSP/frame/nosniff (#48), HSTS/Referrer-Policy
 * (#52), and COOP/CORP/COEP (#54). They do not lock X-Powered-By.
 */

const DISABLE_PATTERN = /disable\(\s*['"]x-powered-by['"]\s*\)/i;

export const EXPRESS_X_POWERED_BY_VALUE = 'Express';

export function sourceDisablesXPoweredBy(source: string): boolean {
  return DISABLE_PATTERN.test(source) || /\bhelmet\b/.test(source);
}

export function vercelSetsXPoweredBy(headerNames: string[]): boolean {
  return headerNames.some((name) => name.toLowerCase() === 'x-powered-by');
}

export function vercelHeaderNames(vercelJson: string): string[] {
  const parsed: unknown = JSON.parse(vercelJson);
  if (typeof parsed !== 'object' || parsed === null || !('headers' in parsed)) {
    return [];
  }
  const blocks = (parsed as { headers?: unknown }).headers;
  if (!Array.isArray(blocks)) {
    return [];
  }
  const names: string[] = [];
  for (const block of blocks) {
    if (typeof block !== 'object' || block === null || !('headers' in block)) {
      continue;
    }
    const headers = (block as { headers?: unknown }).headers;
    if (!Array.isArray(headers)) {
      continue;
    }
    for (const header of headers) {
      if (typeof header !== 'object' || header === null || !('key' in header)) {
        continue;
      }
      const key = (header as { key?: unknown }).key;
      if (typeof key === 'string') {
        names.push(key);
      }
    }
  }
  return names;
}

export function productionDisablesXPoweredBy(): boolean {
  return false;
}
