import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { catalogMatchesQuery } from './catalog-search-filter.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('catalog search name/description matching', () => {
  it('matches name or description case-insensitively', () => {
    assert.equal(
      catalogMatchesQuery({ name: 'Coffee Mug', description: 'Ceramic' }, 'mug'),
      true
    );
    assert.equal(
      catalogMatchesQuery({ name: 'Coffee Mug', description: 'Ceramic' }, 'ceramic'),
      true
    );
    assert.equal(
      catalogMatchesQuery({ name: 'Coffee Mug', description: 'Ceramic' }, 'glass'),
      false
    );
  });

  it('treats a missing description as non-matching and throws on a missing name', () => {
    assert.equal(catalogMatchesQuery({ name: 'Mug', description: null }, 'ceramic'), false);
    assert.throws(
      () => catalogMatchesQuery({ name: null, description: 'Ceramic' }, 'ceramic'),
      TypeError
    );
    assert.throws(
      () => catalogMatchesQuery({ description: 'Ceramic' }, 'ceramic'),
      TypeError
    );
  });
});

describe('catalog search source stays aligned', () => {
  it('still lowercases p.name without optional chaining', () => {
    const appJs = readRepo('public/app.js');
    assert.match(
      appJs,
      /p\.name\.toLowerCase\(\)\.includes\(query\) \|\| p\.description\?\.toLowerCase\(\)\.includes\(query\)/
    );
  });
});
