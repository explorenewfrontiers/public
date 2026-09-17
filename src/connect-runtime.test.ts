import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const sampleDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../stripe-connect-sample'
);

function readSample(relPath: string): string {
  return fs.readFileSync(path.join(sampleDir, relPath), 'utf8');
}

describe('Connect sample ESM runtime contract', () => {
  it('declares the package as ESM while GET / uses __dirname', () => {
    const pkg = JSON.parse(readSample('package.json')) as { type?: string };
    const server = readSample('server.ts');

    assert.equal(pkg.type, 'module');
    assert.match(server, /res\.sendFile\(__dirname \+ '\/public\/index\.html'\)/);
    assert.equal(server.includes('fileURLToPath'), false);
    assert.equal(server.includes('import.meta.url'), false);
  });

  it('throws at import time when STRIPE_SECRET_KEY is missing', () => {
    const server = readSample('server.ts');
    assert.match(server, /if \(!STRIPE_SECRET_KEY\)/);
    assert.match(server, /throw new Error\(/);
    assert.match(server, /STRIPE_SECRET_KEY is not set/);
  });

  it('healthcheck hits GET / which depends on __dirname', () => {
    const dockerfile = readSample('Dockerfile');
    assert.match(
      dockerfile,
      /require\('http'\)\.get\('http:\/\/localhost:3000'/
    );
    assert.match(readSample('server.ts'), /app\.get\('\/'/);
  });
});
