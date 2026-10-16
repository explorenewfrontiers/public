import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  hasHerokuPostbuild,
  procfileCompilesTypeScriptAtBoot,
  productionDynoWouldMissTsc,
  typescriptOnlyInDevDependencies,
  workflowDeploysConnectToHeroku,
  type PackageJsonScripts,
} from './heroku-procfile-tsc-prune.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function readPackageJson(relPath: string): PackageJsonScripts {
  const parsed: unknown = JSON.parse(readRepo(relPath));
  if (typeof parsed !== 'object' || parsed === null) {
    return {};
  }
  return parsed as PackageJsonScripts;
}

describe('Heroku Procfile compiles TypeScript after the buildpack prunes tsc', () => {
  it('compile-at-boot plus typescript-as-devDep without heroku-postbuild misses tsc', () => {
    assert.equal(procfileCompilesTypeScriptAtBoot('web: npm start'), false);
    assert.equal(procfileCompilesTypeScriptAtBoot('web: npm run build && npm start'), true);
    assert.equal(procfileCompilesTypeScriptAtBoot('web: npx tsc && node dist/server.js'), true);

    assert.equal(
      typescriptOnlyInDevDependencies({
        devDependencies: { typescript: '^5.0.0' },
        dependencies: { express: '^4.18.2' },
      }),
      true
    );
    assert.equal(
      typescriptOnlyInDevDependencies({
        dependencies: { typescript: '^5.0.0' },
      }),
      false
    );
    assert.equal(hasHerokuPostbuild({ scripts: { start: 'node dist/server.js' } }), false);
    assert.equal(
      hasHerokuPostbuild({ scripts: { 'heroku-postbuild': 'npm run build' } }),
      true
    );
    assert.equal(
      productionDynoWouldMissTsc({
        compilesAtBoot: true,
        typescriptOnlyDev: true,
        hasHerokuPostbuild: false,
      }),
      true
    );
    assert.equal(
      productionDynoWouldMissTsc({
        compilesAtBoot: false,
        typescriptOnlyDev: true,
        hasHerokuPostbuild: false,
      }),
      false
    );
  });

  it('Connect Procfile builds at boot while typescript is only a devDependency', () => {
    const procfile = readRepo('stripe-connect-sample/Procfile');
    const pkg = readPackageJson('stripe-connect-sample/package.json');

    assert.equal(procfileCompilesTypeScriptAtBoot(procfile), true);
    assert.match(procfile, /web:\s*npm run build && npm start/);
    assert.equal(typescriptOnlyInDevDependencies(pkg), true);
    assert.equal(hasHerokuPostbuild(pkg), false);
    assert.equal(
      productionDynoWouldMissTsc({
        compilesAtBoot: true,
        typescriptOnlyDev: true,
        hasHerokuPostbuild: false,
      }),
      true
    );
  });

  it('GH Actions heroku-deploy uses the sample appdir that ships this Procfile', () => {
    const workflow = readRepo('stripe-connect-sample/.github/workflows/deploy.yml');
    assert.equal(workflowDeploysConnectToHeroku(workflow), true);
    assert.match(workflow, /AkhileshNS\/heroku-deploy/);
  });
});
