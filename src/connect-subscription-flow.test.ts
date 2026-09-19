import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  DASHBOARD_SESSION_LOOKUP_PATH,
  buildBillingPortalParams,
  buildSubscriptionApiResponse,
  buildSubscriptionCheckoutParams,
} from './connect-subscription-flow.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscription checkout params', () => {
  it('bills the connected account as customer_account and returns sessionId only', () => {
    const params = buildSubscriptionCheckoutParams('acct_123', 'price_sub');
    assert.equal(params.customer_account, 'acct_123');
    assert.equal(params.mode, 'subscription');
    assert.deepEqual(params.line_items, [{ price: 'price_sub', quantity: 1 }]);

    const response = buildSubscriptionApiResponse('cs_test_sub');
    assert.deepEqual(response, { success: true, sessionId: 'cs_test_sub' });
    assert.equal('url' in response, false);
  });

  it('billing portal also targets the connected account as the customer', () => {
    const params = buildBillingPortalParams('acct_123');
    assert.equal(params.customer_account, 'acct_123');
    assert.equal(params.return_url, 'http://localhost:3000/dashboard?accountId=acct_123');
  });
});

describe('Connect subscription completion source stays aligned', () => {
  it('dashboard looks up /get-session after an API that only returns sessionId', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    assert.match(server, /customer_account: accountId/);
    assert.match(server, /mode: 'subscription'/);
    assert.match(
      server,
      /res\.json\(\{\s*success: true,\s*sessionId: session\.id,\s*\}\)/
    );
    assert.equal(server.includes("app.post('/get-session'"), false);
    assert.equal(server.includes("app.get('/get-session'"), false);
    assert.equal(server.includes(DASHBOARD_SESSION_LOOKUP_PATH), false);

    assert.match(
      dashboard,
      /const response = await fetch\('\/get-session'/
    );
    assert.match(dashboard, /body: JSON\.stringify\(\{ sessionId: result\.sessionId \}\)/);
    assert.match(dashboard, /window\.location\.href = session\.url/);
  });
});
