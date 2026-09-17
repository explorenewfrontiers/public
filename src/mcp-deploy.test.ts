import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRoot(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('root MCP Docker layout', () => {
  it('copies a prebuilt dist/ and never runs tsc in the image', () => {
    const dockerfile = readRoot('Dockerfile');
    assert.match(dockerfile, /COPY dist \.\/dist/);
    assert.equal(dockerfile.includes('npm run build'), false);
    assert.equal(dockerfile.includes('COPY src'), false);
    assert.match(dockerfile, /CMD \["node", "dist\/index\.js"\]/);
  });

  it('compose mounts ./dist and does not pass MCP_API_KEY', () => {
    const compose = readRoot('docker-compose.yml');
    assert.match(compose, /-\s+\.\/dist:\/app\/dist/);
    assert.match(compose, /STRIPE_API_KEY=\$\{STRIPE_API_KEY\}/);
    assert.equal(compose.includes('MCP_API_KEY'), false);
  });

  it('root tsconfig emits dist from src, which the image copies instead of building', () => {
    const tsconfig = JSON.parse(readRoot('tsconfig.json')) as {
      compilerOptions: { outDir: string; rootDir: string };
      include: string[];
    };
    assert.equal(tsconfig.compilerOptions.outDir, './dist');
    assert.equal(tsconfig.compilerOptions.rootDir, './src');
    assert.deepEqual(tsconfig.include, ['src/**/*']);
  });
});
