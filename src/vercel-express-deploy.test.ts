import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CONNECT_EXPRESS_ENTRY,
  VERCEL_FUNCTIONS_GLOB,
  functionsGlobMatchesExpressEntry,
  vercelHasExpressServerlessEntry,
  vercelOutputIsStaticDist,
  vercelRewritesToServer,
} from './vercel-express-deploy.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Vercel config cannot host the Express Connect app', () => {
  it('functions glob does not match server.ts at the package root', () => {
    assert.equal(
      functionsGlobMatchesExpressEntry(VERCEL_FUNCTIONS_GLOB, CONNECT_EXPRESS_ENTRY),
      false
    );
    assert.equal(vercelHasExpressServerlessEntry(), false);
    assert.equal(vercelRewritesToServer(), false);
    assert.equal(vercelOutputIsStaticDist(), true);
  });
});

describe('Vercel Express deploy source stays aligned', () => {
  it('vercel.json uses static dist output, api/**/*.ts functions, and no rewrites', () => {
    const vercel = JSON.parse(
      readRepo('stripe-connect-sample/vercel.json')
    ) as {
      outputDirectory?: string;
      functions?: Record<string, unknown>;
      rewrites?: unknown;
      redirects?: Array<{ source: string; destination: string }>;
    };

    assert.equal(vercel.outputDirectory, 'dist');
    assert.deepEqual(Object.keys(vercel.functions ?? {}), ['api/**/*.ts']);
    assert.equal(vercel.rewrites, undefined);

    const leftover = (vercel.redirects ?? []).find((r) => r.source === '/old-path');
    assert.ok(leftover, 'placeholder /old-path redirect is still present');
    assert.equal(leftover.destination, '/');

    const connectDir = path.join(repoRoot, 'stripe-connect-sample');
    assert.equal(fs.existsSync(path.join(connectDir, 'server.ts')), true);
    assert.equal(fs.existsSync(path.join(connectDir, 'api')), false);
    assert.equal(fs.existsSync(path.join(connectDir, 'src', 'server.ts')), false);
  });
});
