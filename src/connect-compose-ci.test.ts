import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sampleDir = path.join(repoRoot, 'stripe-connect-sample');

function readSample(relPath: string): string {
  return fs.readFileSync(path.join(sampleDir, relPath), 'utf8');
}

describe('Connect compose and CI layout', () => {
  it('compose mounts ./dist over the image and does not build TypeScript', () => {
    const compose = readSample('docker-compose.yml');
    const dockerignore = readSample('.dockerignore');

    assert.match(compose, /-\s+\.\/dist:\/app\/dist/);
    assert.match(compose, /STRIPE_SECRET_KEY=\$\{STRIPE_SECRET_KEY\}/);
    assert.match(compose, /STRIPE_PUBLISHABLE_KEY=\$\{STRIPE_PUBLISHABLE_KEY\}/);
    assert.equal(compose.includes('npm run build'), false);
    assert.match(dockerignore, /^dist$/m);
  });

  it('GitHub Actions builds the sample image whose Dockerfile copies a missing src/', () => {
    const workflow = readSample('.github/workflows/deploy.yml');
    const dockerfile = readSample('Dockerfile');

    assert.match(workflow, /context: \.\/stripe-connect-sample/);
    assert.match(workflow, /appdir: "stripe-connect-sample"/);
    assert.match(dockerfile, /COPY src \.\/src/);
    assert.equal(fs.existsSync(path.join(sampleDir, 'src')), false);
    assert.equal(fs.existsSync(path.join(sampleDir, 'server.ts')), true);
  });
});
