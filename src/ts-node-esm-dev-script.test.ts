import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  documentedDevScriptWouldFailOnEsm,
  packageIsNativeEsm,
  scriptPointsAtMissingEntry,
  tsNodeScriptHasEsmSupport,
  tsconfigEnablesTsNodeEsm,
  type PackageJsonLite,
  type TsconfigLite,
} from './ts-node-esm-dev-script.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function readJson<T>(relPath: string): T {
  return JSON.parse(readRepo(relPath)) as T;
}

describe('Documented npm run dev fails on ESM ts-node without a loader', () => {
  it('native ESM plus bare ts-node is a failed boot unless tsconfig.esm or --esm is set', () => {
    assert.equal(packageIsNativeEsm({ type: 'module' }), true);
    assert.equal(packageIsNativeEsm({}), false);
    assert.equal(tsNodeScriptHasEsmSupport('ts-node src/index.ts'), false);
    assert.equal(tsNodeScriptHasEsmSupport('ts-node --esm src/index.ts'), true);
    assert.equal(tsNodeScriptHasEsmSupport('node --loader ts-node/esm src/index.ts'), true);
    assert.equal(tsNodeScriptHasEsmSupport('tsx src/index.ts'), true);
    assert.equal(tsconfigEnablesTsNodeEsm({}), false);
    assert.equal(tsconfigEnablesTsNodeEsm({ 'ts-node': { esm: true } }), true);

    assert.equal(
      documentedDevScriptWouldFailOnEsm({
        isEsm: true,
        scriptHasEsmSupport: false,
        tsconfigEsm: false,
      }),
      true
    );
    assert.equal(
      documentedDevScriptWouldFailOnEsm({
        isEsm: true,
        scriptHasEsmSupport: true,
        tsconfigEsm: false,
      }),
      false
    );
    assert.equal(
      scriptPointsAtMissingEntry({
        script: 'ts-node src/server.ts',
        existingRelativePaths: ['server.ts'],
      }),
      true
    );
    assert.equal(
      scriptPointsAtMissingEntry({
        script: 'ts-node src/index.ts',
        existingRelativePaths: ['src/index.ts'],
      }),
      false
    );
  });

  it('root package.json type=module and npm run dev/dev:web use bare ts-node', () => {
    const pkg = readJson<PackageJsonLite>('package.json');
    const tsconfig = readJson<TsconfigLite>('tsconfig.json');
    const readme = readRepo('README.md');

    assert.equal(packageIsNativeEsm(pkg), true);
    assert.equal(tsconfigEnablesTsNodeEsm(tsconfig), false);
    assert.match(readme, /npm run dev/);

    for (const name of ['dev', 'dev:web'] as const) {
      const script = pkg.scripts?.[name] ?? '';
      assert.match(script, /^ts-node\s+src\//);
      assert.equal(tsNodeScriptHasEsmSupport(script), false);
      assert.equal(
        documentedDevScriptWouldFailOnEsm({
          isEsm: true,
          scriptHasEsmSupport: false,
          tsconfigEsm: false,
        }),
        true
      );
    }
  });

  it('Connect npm run dev points at missing src/server.ts with the same ESM ts-node gap', () => {
    const pkg = readJson<PackageJsonLite>('stripe-connect-sample/package.json');
    const tsconfig = readJson<TsconfigLite>('stripe-connect-sample/tsconfig.json');
    const sampleRoot = path.join(repoRoot, 'stripe-connect-sample');
    const existing = ['server.ts', 'src/server.ts'].filter((rel) =>
      fs.existsSync(path.join(sampleRoot, rel))
    );

    assert.equal(packageIsNativeEsm(pkg), true);
    assert.equal(tsconfigEnablesTsNodeEsm(tsconfig), false);
    assert.equal(pkg.scripts?.dev, 'ts-node src/server.ts');
    assert.equal(tsNodeScriptHasEsmSupport(pkg.scripts?.dev ?? ''), false);
    assert.deepEqual(existing, ['server.ts']);
    assert.equal(
      scriptPointsAtMissingEntry({
        script: pkg.scripts?.dev ?? '',
        existingRelativePaths: existing,
      }),
      true
    );
    assert.equal(
      documentedDevScriptWouldFailOnEsm({
        isEsm: true,
        scriptHasEsmSupport: false,
        tsconfigEsm: false,
      }),
      true
    );
  });
});
