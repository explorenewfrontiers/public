import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dockerfileCopiesEntireDist,
  dockerfileStripsSourceMaps,
  dockerignoreExcludesMaps,
  parseTsconfigCompilerOptions,
  productionImageWouldShipMaps,
  tsconfigEmitsSourceMaps,
} from './docker-sourcemap-leak.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Docker images ship tsc source maps from dist/', () => {
  it('root tsconfig emits sourceMap and declarationMap and the Dockerfile copies dist/', () => {
    const options = parseTsconfigCompilerOptions(readRepo('tsconfig.json'));
    const dockerfile = readRepo('Dockerfile');

    assert.equal(options.sourceMap, true);
    assert.equal(options.declarationMap, true);
    assert.equal(tsconfigEmitsSourceMaps(options), true);
    assert.equal(dockerfileCopiesEntireDist(dockerfile), true);
    assert.equal(dockerfileStripsSourceMaps(dockerfile), false);
    assert.equal(
      productionImageWouldShipMaps({
        sourceMap: true,
        copiesEntireDist: true,
        stripsMaps: false,
      }),
      true
    );
  });

  it('Connect builder tsc source maps are copied into the runtime stage', () => {
    const options = parseTsconfigCompilerOptions(
      readRepo('stripe-connect-sample/tsconfig.json')
    );
    const dockerfile = readRepo('stripe-connect-sample/Dockerfile');
    const dockerignore = readRepo('stripe-connect-sample/.dockerignore');

    assert.equal(options.sourceMap, true);
    assert.equal(options.declarationMap, true);
    assert.equal(dockerfileCopiesEntireDist(dockerfile), true);
    assert.equal(dockerfileStripsSourceMaps(dockerfile), false);
    assert.equal(dockerignoreExcludesMaps(dockerignore), false);
    assert.match(dockerignore, /^dist$/m);
  });

  it('repo root has no .dockerignore to exclude *.map from the MCP image context', () => {
    assert.equal(fs.existsSync(path.join(repoRoot, '.dockerignore')), false);
  });
});
