import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP HTTP transport source stays aligned', () => {
  it('serves plain HTTP while README tells Claude to connect with https://localhost', () => {
    const index = readRepo('src/index.ts');
    const readme = readRepo('README.md');

    assert.equal(index.includes("import http from 'http'"), true);
    assert.equal(index.includes('http.createServer'), true);
    assert.equal(index.includes('https.createServer'), false);
    assert.equal(index.includes("import https"), false);
    assert.equal(index.includes('Access-Control-Allow-Origin'), false);
    assert.match(
      index,
      /if \(req\.method !== 'POST'\) \{\s*res\.writeHead\(405\);\s*res\.end\(JSON\.stringify\(\{ error: 'Method not allowed' \}\)\);/
    );

    assert.equal(readme.includes('https://localhost:8000'), true);
    assert.equal(readme.includes('http://localhost:8000'), true);
  });
});
