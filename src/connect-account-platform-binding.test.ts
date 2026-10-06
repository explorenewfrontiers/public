import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  hasPlatformUserBinding,
  productionAccountCreateSetsMetadata,
} from './connect-account-platform-binding.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function handlerSource(connect: string, route: string): string {
  const start = connect.indexOf(route);
  assert.notEqual(start, -1, `missing ${route}`);
  const next = connect.indexOf('// ========', start + route.length);
  return connect.slice(start, next === -1 ? undefined : next);
}

describe('Connect account create has no platform-user binding', () => {
  it('requires metadata.platform_user_id to correlate accounts', () => {
    assert.equal(
      hasPlatformUserBinding({
        display_name: 'Cafe',
        contact_email: 'a@example.com',
        metadata: { platform_user_id: 'user_123' },
      }),
      true
    );
    assert.equal(
      hasPlatformUserBinding({
        display_name: 'Cafe',
        contact_email: 'a@example.com',
      }),
      false
    );
    assert.equal(
      hasPlatformUserBinding({
        display_name: 'Cafe',
        contact_email: 'a@example.com',
        metadata: { platform_user_id: '   ' },
      }),
      false
    );
    assert.equal(productionAccountCreateSetsMetadata(), false);
  });
});

describe('Connect account-create source stays aligned', () => {
  it('POST /api/accounts creates with no metadata field', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');
    const body = handlerSource(connect, "app.post('/api/accounts'");

    assert.match(body, /v2\.core\.accounts\.create\(/);
    assert.match(body, /display_name: displayName/);
    assert.match(body, /contact_email: contactEmail/);
    assert.equal(body.includes('metadata:'), false);
    assert.equal(body.includes('platform_user_id'), false);
    assert.match(body, /TODO: In a production application, store the mapping/);
  });
});
