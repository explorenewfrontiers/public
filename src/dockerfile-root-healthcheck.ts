/**
 * Mirrors container hardening in the root MCP Dockerfile versus the
 * Connect sample Dockerfile.
 *
 * Open PRs #14/#15 lock that the root image copies prebuilt dist/ and
 * that compose omits MCP_API_KEY. They do not lock that the MCP image
 * runs as root with no HEALTHCHECK, so orchestrators treat a hung
 * process as healthy and a container breakout starts as uid 0.
 */

export function dockerfileDeclaresNonRootUser(dockerfile: string): boolean {
  return /^\s*USER\s+(?!root\b)/im.test(dockerfile);
}

export function dockerfileHasHealthcheck(dockerfile: string): boolean {
  return /^\s*HEALTHCHECK\b/im.test(dockerfile);
}

export function productionRootImageRunsAsRoot(): boolean {
  return true;
}

export function productionRootImageHasHealthcheck(): boolean {
  return false;
}
