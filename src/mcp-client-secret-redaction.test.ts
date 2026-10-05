import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  mcpToolResultText,
  productionRedactsClientSecret,
  textIncludesClientSecret,
} from './mcp-client-secret-redaction.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP money tools leak client_secret', () => {
  it('stringifies the raw PaymentIntent including client_secret', () => {
    const secret = 'pi_test_secret_do_not_log';
    const text = mcpToolResultText({
      id: 'pi_test_1',
      object: 'payment_intent',
      amount: 500,
      currency: 'usd',
      client_secret: secret,
      status: 'requires_payment_method',
    });

    assert.equal(textIncludesClientSecret(text, secret), true);
    assert.match(text, /"client_secret": "pi_test_secret_do_not_log"/);
    assert.equal(productionRedactsClientSecret(), false);
  });
});

describe('MCP client_secret source stays aligned', () => {
  it('create/get payment intent return the Stripe object and stringify it', () => {
    const mcp = readRepo('src/index.ts');

    const createStart = mcp.indexOf("case 'create_payment_intent'");
    const createEnd = mcp.indexOf("case 'get_payment_intent'", createStart);
    const create = mcp.slice(createStart, createEnd);
    assert.match(create, /paymentIntents\.create\(/);
    assert.match(create, /return intent;/);
    assert.equal(create.includes('client_secret'), false);

    const getStart = mcp.indexOf("case 'get_payment_intent'");
    const getEnd = mcp.indexOf("case 'list_invoices'", getStart);
    const get = mcp.slice(getStart, getEnd);
    assert.match(get, /paymentIntents\.retrieve\(/);
    assert.match(get, /return intent;/);

    const callTool = mcp.slice(
      mcp.indexOf("case 'call_tool'"),
      mcp.indexOf("default:\n        return {\n          jsonrpc: '2.0'")
    );
    assert.match(callTool, /JSON\.stringify\(result, null, 2\)/);
    assert.equal(callTool.includes('client_secret'), false);
    assert.equal(callTool.includes('redact'), false);
  });
});
