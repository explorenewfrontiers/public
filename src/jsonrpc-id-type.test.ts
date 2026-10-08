import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  echoJsonRpcId,
  isSpecLegalJsonRpcId,
  productionRejectsNonScalarJsonRpcId,
} from './jsonrpc-id-type.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('JSON-RPC id objects and arrays are forwarded', () => {
  it('treats objects, arrays, and booleans as illegal ids and still echoes them', () => {
    const objectId = { nested: true, $gt: '' };
    const arrayId = [1, 2];

    assert.equal(isSpecLegalJsonRpcId('req-1'), true);
    assert.equal(isSpecLegalJsonRpcId(1), true);
    assert.equal(isSpecLegalJsonRpcId(null), true);
    assert.equal(isSpecLegalJsonRpcId(objectId), false);
    assert.equal(isSpecLegalJsonRpcId(arrayId), false);
    assert.equal(isSpecLegalJsonRpcId(true), false);

    assert.equal(echoJsonRpcId(objectId), objectId);
    assert.equal(echoJsonRpcId(arrayId), arrayId);
    assert.equal(echoJsonRpcId(true), true);
    assert.equal(productionRejectsNonScalarJsonRpcId(), false);
  });
});

describe('JSON-RPC id source stays aligned', () => {
  it('copies request.id onto every JSON-RPC response without a type check', () => {
    const source = readRepo('src/index.ts');

    assert.match(source, /id: string \| number \| null;/);
    assert.equal((source.match(/id: request\.id,/g) ?? []).length >= 4, true);
    assert.equal(source.includes('isSpecLegalJsonRpcId'), false);
    assert.equal(/typeof request\.id/.test(source), false);
    assert.equal(productionRejectsNonScalarJsonRpcId(), false);
  });
});
