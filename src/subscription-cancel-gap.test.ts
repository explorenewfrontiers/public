import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsCancelEndpoint,
  extractConnectSubscriptionRoute,
  extractDashboardApiDocs,
  extractMcpToolRecord,
  inspectSubscriptionCancelGap,
  recurringBillingCannotBeStopped,
  sourceCallsSubscriptionsCancel,
  sourceDefinesTool,
  sourceHandlesCancelSubscriptionTool,
  sourceSetsCancelAtPeriodEnd,
} from './subscription-cancel-gap.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP and Connect cannot cancel subscriptions', () => {
  it('missing cancel tools leave recurring billing running after a create', () => {
    assert.equal(recurringBillingCannotBeStopped(false, false), true);
    assert.equal(recurringBillingCannotBeStopped(true, false), false);
    assert.equal(recurringBillingCannotBeStopped(false, true), false);

    assert.equal(
      sourceDefinesTool(`'cancel_subscription': {`, 'cancel_subscription'),
      true
    );
    assert.equal(
      sourceDefinesTool(`'create_payment_intent': {`, 'cancel_subscription'),
      false
    );
    assert.equal(
      sourceCallsSubscriptionsCancel(`await stripe.subscriptions.cancel(`),
      true
    );
    assert.equal(
      sourceCallsSubscriptionsCancel(`await stripe.subscriptions.create({`),
      false
    );
    assert.equal(
      sourceHandlesCancelSubscriptionTool(`case 'cancel_subscription': {`),
      true
    );
    assert.equal(
      sourceHandlesCancelSubscriptionTool(`case 'create_payment_intent': {`),
      false
    );
    assert.equal(
      sourceSetsCancelAtPeriodEnd(`cancel_at_period_end: true`),
      true
    );
    // webhook *reads* previous_attributes.cancel_at_period_end — not a write
    assert.equal(
      sourceSetsCancelAtPeriodEnd(
        `if (event.data.previous_attributes?.cancel_at_period_end === false)`
      ),
      false
    );
    assert.equal(
      dashboardDocumentsCancelEndpoint(
        '<li><strong>POST /api/subscriptions/:id/cancel</strong></li>'
      ),
      true
    );
    assert.equal(
      dashboardDocumentsCancelEndpoint(
        '<li><strong>POST /api/subscriptions</strong> - Create subscription</li>'
      ),
      false
    );
  });

  it('MCP defines money tools but no cancel/list/update subscription tools', () => {
    const source = readRepo('src/index.ts');
    const tools = extractMcpToolRecord(source);
    const fields = inspectSubscriptionCancelGap(source);

    assert.match(tools, /create_payment_intent/);
    assert.match(tools, /list_invoices/);
    assert.match(tools, /get_invoice/);
    assert.doesNotMatch(tools, /cancel_subscription/);
    assert.doesNotMatch(tools, /list_subscriptions/);
    assert.doesNotMatch(tools, /update_subscription/);
    assert.equal(sourceDefinesTool(tools, 'create_payment_intent'), true);
    assert.equal(sourceDefinesTool(tools, 'cancel_subscription'), false);
    assert.equal(sourceDefinesTool(tools, 'list_subscriptions'), false);
    assert.equal(sourceDefinesTool(tools, 'update_subscription'), false);
    assert.equal(sourceCallsSubscriptionsCancel(source), false);
    assert.equal(sourceHandlesCancelSubscriptionTool(source), false);
    assert.equal(fields.hasCancelSubscriptionTool, false);
    assert.equal(fields.hasListSubscriptionsTool, false);
    assert.equal(fields.hasUpdateSubscriptionTool, false);
    assert.equal(fields.callsSubscriptionsCancel, false);
    assert.equal(fields.handlesCancelSubscriptionTool, false);
    assert.equal(
      recurringBillingCannotBeStopped(
        fields.hasCancelSubscriptionTool,
        fields.callsSubscriptionsCancel
      ),
      true
    );
  });

  it('Connect can create Checkout subscriptions but never calls subscriptions.cancel', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const html = readRepo('stripe-connect-sample/public/index.html');
    const route = extractConnectSubscriptionRoute(source);
    const docs = extractDashboardApiDocs(html);
    const fields = inspectSubscriptionCancelGap(source);

    assert.match(route, /app\.post\('\/api\/subscriptions'/);
    assert.match(route, /mode:\s*['"]subscription['"]/);
    assert.match(route, /sessionId:\s*session\.id/);
    assert.doesNotMatch(route, /subscriptions\.cancel/);
    assert.equal(sourceCallsSubscriptionsCancel(source), false);
    assert.equal(fields.callsSubscriptionsCancel, false);
    assert.equal(fields.hasCancelSubscriptionTool, false);
    assert.equal(
      recurringBillingCannotBeStopped(
        fields.hasCancelSubscriptionTool,
        fields.callsSubscriptionsCancel
      ),
      true
    );
    // webhook only *reads* cancel_at_period_end after Stripe already set it
    assert.match(source, /previous_attributes\?\.cancel_at_period_end/);
    assert.equal(sourceSetsCancelAtPeriodEnd(source), false);
    assert.match(docs, /POST \/api\/subscriptions/);
    assert.match(docs, /POST \/api\/billing-portal/);
    assert.equal(dashboardDocumentsCancelEndpoint(docs), false);
    assert.equal(dashboardDocumentsCancelEndpoint(html), false);
  });
});
