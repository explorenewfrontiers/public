import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import cors from 'cors';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  CATALOG_CHECKOUT_PATH,
  productionSetsCorsCredentials,
  sourceEnablesCorsCredentials,
  sourceUsesDefaultCorsCall,
} from './catalog-cors-credentials.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function corsHeaders(origin: string | undefined): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const req = {
      method: 'GET',
      headers: origin === undefined ? {} : { origin },
    } as IncomingMessage;
    const collected: Record<string, string> = {};
    const res = {
      setHeader(name: string, value: unknown) {
        collected[name.toLowerCase()] = String(value);
      },
      getHeader(name: string) {
        return collected[name.toLowerCase()];
      },
      end() {},
    } as unknown as ServerResponse;

    cors()(req, res, (err?: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(collected);
    });
  });
}

describe('default catalog cors() does not emit credentials', () => {
  it('sets ACAO * and omits Allow-Credentials for foreign and null origins', async () => {
    const evil = await corsHeaders('https://evil.test');
    assert.equal(evil['access-control-allow-origin'], '*');
    assert.equal(evil['access-control-allow-credentials'], undefined);

    const sandbox = await corsHeaders('null');
    assert.equal(sandbox['access-control-allow-origin'], '*');
    assert.equal(sandbox['access-control-allow-credentials'], undefined);

    const missing = await corsHeaders(undefined);
    assert.equal(missing['access-control-allow-origin'], '*');
    assert.equal(productionSetsCorsCredentials(), false);
  });
});

describe('catalog CORS source stays aligned', () => {
  it('calls cors() with no options and never enables credentials', () => {
    const source = readRepo('src/web-server.ts');

    assert.equal(sourceUsesDefaultCorsCall(source), true);
    assert.equal(sourceEnablesCorsCredentials(source), false);
    assert.match(source, new RegExp(`app\\.post\\('${CATALOG_CHECKOUT_PATH}'`));
    assert.equal(source.includes('origin:'), false);
  });
});
