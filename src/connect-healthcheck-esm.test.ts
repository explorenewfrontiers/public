import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  healthcheckCompatibleWithPackageType,
  healthcheckUsesCjsRequire,
  productionHealthcheckWorksUnderEsm,
} from './connect-healthcheck-esm.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect HEALTHCHECK require() is incompatible with ESM', () => {
  it('flags a CJS require probe when package.json type is module', () => {
    const cjsProbe =
      "node -e \"require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})\"";
    const esmProbe =
      "node -e \"fetch('http://127.0.0.1:3000').then((r) => { if (!r.ok) process.exit(1); })\"";

    assert.equal(healthcheckUsesCjsRequire(cjsProbe), true);
    assert.equal(healthcheckUsesCjsRequire(esmProbe), false);
    assert.equal(healthcheckCompatibleWithPackageType('module', cjsProbe), false);
    assert.equal(healthcheckCompatibleWithPackageType('commonjs', cjsProbe), true);
    assert.equal(healthcheckCompatibleWithPackageType('module', esmProbe), true);
    assert.equal(productionHealthcheckWorksUnderEsm(), false);
  });
});

describe('Connect HEALTHCHECK source stays aligned', () => {
  it('uses require(http) while package.json is type module', () => {
    const dockerfile = readRepo('stripe-connect-sample/Dockerfile');
    const pkg = JSON.parse(readRepo('stripe-connect-sample/package.json')) as {
      type?: string;
    };

    assert.match(dockerfile, /HEALTHCHECK --interval=30s/);
    assert.match(dockerfile, /require\('http'\)\.get\('http:\/\/localhost:3000'/);
    assert.equal(pkg.type, 'module');
    assert.equal(healthcheckUsesCjsRequire(dockerfile), true);
    assert.equal(
      healthcheckCompatibleWithPackageType(pkg.type ?? '', dockerfile),
      false
    );
    assert.equal(productionHealthcheckWorksUnderEsm(), false);
  });
});
