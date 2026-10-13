import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { loadEnv } from './load-env.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('loadEnv', () => {
  it('reads STRIPE_API_KEY and MCP_API_KEY from a .env file in cwd', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-dotenv-'));
    fs.writeFileSync(
      path.join(dir, '.env'),
      'STRIPE_API_KEY=sk_test_from_dotenv_file\nMCP_API_KEY=mcp_from_dotenv_file\n'
    );

    const cwd = process.cwd();
    const prevStripe = process.env.STRIPE_API_KEY;
    const prevMcp = process.env.MCP_API_KEY;
    delete process.env.STRIPE_API_KEY;
    delete process.env.MCP_API_KEY;

    try {
      process.chdir(dir);
      const result = loadEnv();
      assert.equal(result.error, undefined);
      assert.equal(process.env.STRIPE_API_KEY, 'sk_test_from_dotenv_file');
      assert.equal(process.env.MCP_API_KEY, 'mcp_from_dotenv_file');
    } finally {
      process.chdir(cwd);
      if (prevStripe === undefined) {
        delete process.env.STRIPE_API_KEY;
      } else {
        process.env.STRIPE_API_KEY = prevStripe;
      }
      if (prevMcp === undefined) {
        delete process.env.MCP_API_KEY;
      } else {
        process.env.MCP_API_KEY = prevMcp;
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not override an already-set STRIPE_API_KEY', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-dotenv-keep-'));
    fs.writeFileSync(path.join(dir, '.env'), 'STRIPE_API_KEY=sk_test_from_file\n');

    const cwd = process.cwd();
    const prevStripe = process.env.STRIPE_API_KEY;
    process.env.STRIPE_API_KEY = 'sk_test_already_set';

    try {
      process.chdir(dir);
      loadEnv();
      assert.equal(process.env.STRIPE_API_KEY, 'sk_test_already_set');
    } finally {
      process.chdir(cwd);
      if (prevStripe === undefined) {
        delete process.env.STRIPE_API_KEY;
      } else {
        process.env.STRIPE_API_KEY = prevStripe;
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('MCP and catalog servers load .env before reading keys', () => {
  it('calls loadEnv() before process.env.STRIPE_API_KEY in the MCP server', () => {
    const source = readRepo('src/index.ts');
    assert.match(source, /from '\.\/load-env\.js'/);
    const loadAt = source.indexOf('loadEnv()');
    const keyAt = source.indexOf('process.env.STRIPE_API_KEY');
    assert.ok(loadAt >= 0, 'MCP server must call loadEnv()');
    assert.ok(keyAt >= 0, 'MCP server must read STRIPE_API_KEY');
    assert.ok(loadAt < keyAt, 'loadEnv() must run before STRIPE_API_KEY is read');
  });

  it('calls loadEnv() before process.env.STRIPE_API_KEY in the catalog website', () => {
    const source = readRepo('src/web-server.ts');
    assert.match(source, /from '\.\/load-env\.js'/);
    const loadAt = source.indexOf('loadEnv()');
    const keyAt = source.indexOf('process.env.STRIPE_API_KEY');
    assert.ok(loadAt >= 0, 'catalog website must call loadEnv()');
    assert.ok(keyAt >= 0, 'catalog website must read STRIPE_API_KEY');
    assert.ok(loadAt < keyAt, 'loadEnv() must run before STRIPE_API_KEY is read');
  });

  it('calls loadEnv() before process.env.MCP_API_KEY', () => {
    const source = readRepo('src/index.ts');
    const loadAt = source.indexOf('loadEnv()');
    const keyAt = source.indexOf('process.env.MCP_API_KEY');
    assert.ok(loadAt >= 0 && keyAt >= 0 && loadAt < keyAt);
  });
});
