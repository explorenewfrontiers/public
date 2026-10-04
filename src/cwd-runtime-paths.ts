/**
 * Mirrors cwd-relative runtime paths in both apps.
 *
 * Open PRs #12/#14/#36 lock Docker/tsconfig/__dirname layout. They do not
 * lock that dotenv.config(), express.static('public'), and catalog static
 * files resolve from process.cwd(). Starting the compiled server from the
 * repo root (or a process manager cwd) loads the wrong .env and serves no
 * dashboard/storefront assets.
 */

export function isCwdRelativeStaticRoot(staticRoot: string): boolean {
  return staticRoot === 'public';
}

export function dotenvUsesDefaultCwd(dotenvCall: string): boolean {
  return dotenvCall.includes('dotenv.config()') && !dotenvCall.includes('path:');
}

export function resolveStaticFromCwd(
  cwd: string,
  staticRoot: string
): string {
  return `${cwd.replace(/\/$/, '')}/${staticRoot}`;
}

export function resolveStaticFromModuleDir(
  moduleDir: string,
  staticRoot: string
): string {
  return `${moduleDir.replace(/\/$/, '')}/${staticRoot}`;
}
