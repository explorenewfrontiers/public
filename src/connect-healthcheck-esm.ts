/**
 * Mirrors the Connect sample Docker HEALTHCHECK versus package.json
 * "type": "module".
 *
 * Open PR #14 locks that GET / uses __dirname (ReferenceError under
 * ESM). Open PR #44 locks that the Connect image has a HEALTHCHECK
 * at all. Neither locks that the probe is
 * `node -e "require('http').get(...)"` while the copied package.json
 * is ESM, so Node treats --eval as an ES module and require is not
 * defined — the probe fails even when the process is healthy.
 */

export function healthcheckUsesCjsRequire(command: string): boolean {
  return /require\(['"]http['"]\)/.test(command);
}

export function healthcheckCompatibleWithPackageType(
  packageType: string,
  healthcheckCommand: string
): boolean {
  if (packageType === 'module' && healthcheckUsesCjsRequire(healthcheckCommand)) {
    return false;
  }
  return true;
}

export function productionHealthcheckWorksUnderEsm(): boolean {
  return false;
}
