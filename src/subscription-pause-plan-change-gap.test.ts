import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsPauseOrPlanChangeEndpoint,
  extractConnectSubscriptionRoute,
  extractDashboardApiDocs,
  extractMcpToolRecord,
  inspectSubscriptionPausePlanChangeGap,
  recurringBillingCannotBePausedOrChanged,
  sourceCallsSubscriptionsUpdate,
  sourceDefinesTool,
  sourceHandlesPauseSubscriptionTool,
  sourceSetsPauseCollection,
  sourceSetsSubscriptionUpdateItems,
} from './subscription-pause-plan-change-gap.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP and Connect cannot pause or change-plan subscriptions', () => {
  it('missing pause tools and subscriptions.update leave recurring billing unpausable', () => {
    assert.equal(recurringBillingCannotBePausedOrChanged(false, false), true);
    assert.equal(recurringBillingCannotBePausedOrChanged(true, false), false);
    assert.equal(recurringBillingCannotBePausedOrChanged(false, true), false);

    assert.equal(
      sourceDefinesTool(`'pause_subscription': {`, 'pause_subscription'),
      true
    );
    assert.equal(
      sourceDefinesTool(`'create_payment_intent': {`, 'pause_subscription'),
      false
    );
    // cancel_subscription (#73) is not a pause tool
    assert.equal(
      sourceDefinesTool(`'cancel_subscription': {`, 'pause_subscription'),
      false
    );
    assert.equal(
      sourceCallsSubscriptionsUpdate(`await stripe.subscriptions.update(`),
      true
    );
    assert.equal(
      sourceCallsSubscriptionsUpdate(`await stripe.subscriptions.cancel(`),
      false
    );
    assert.equal(
      sourceCallsSubscriptionsUpdate(`await stripe.subscriptions.create({`),
      false
    );
    // inbound webhook event name is not an outbound update call
    assert.equal(
      sourceCallsSubscriptionsUpdate(`case 'customer.subscription.updated': {`),
      false
    );
    assert.equal(
      sourceHandlesPauseSubscriptionTool(`case 'pause_subscription': {`),
      true
    );
    assert.equal(
      sourceHandlesPauseSubscriptionTool(`case 'cancel_subscription': {`),
      false
    );
    assert.equal(
      sourceSetsPauseCollection(`pause_collection: { behavior: 'void' }`),
      true
    );
    assert.equal(
      sourceSetsPauseCollection(`case 'customer.subscription.paused': {`),
      false
    );
    assert.equal(
      sourceSetsSubscriptionUpdateItems(
        `await stripe.subscriptions.update('sub_1', { items: [{ id: 'si_1', price: 'price_pro' }] })`
      ),
      true
    );
    assert.equal(
      sourceSetsSubscriptionUpdateItems(
        `await stripe.subscriptions.update('sub_1', { pause_collection: { behavior: 'void' } })`
      ),
      false
    );
    assert.equal(
      dashboardDocumentsPauseOrPlanChangeEndpoint(
        '<li><strong>POST /api/subscriptions/:id/pause</strong></li>'
      ),
      true
    );
    assert.equal(
      dashboardDocumentsPauseOrPlanChangeEndpoint(
        '<li><strong>POST /api/subscriptions</strong> - Create subscription</li>'
      ),
      false
    );
  });

  it('MCP defines money tools but no pause_subscription tool and never updates subscriptions', () => {
    const source = readRepo('src/index.ts');
    const tools = extractMcpToolRecord(source);
    const fields = inspectSubscriptionPausePlanChangeGap(source);

    assert.match(tools, /create_payment_intent/);
    assert.match(tools, /list_invoices/);
    assert.match(tools, /get_invoice/);
    assert.doesNotMatch(tools, /pause_subscription/);
    assert.equal(sourceDefinesTool(tools, 'create_payment_intent'), true);
    assert.equal(sourceDefinesTool(tools, 'pause_subscription'), false);
    assert.equal(sourceCallsSubscriptionsUpdate(source), false);
    assert.equal(sourceHandlesPauseSubscriptionTool(source), false);
    assert.equal(sourceSetsPauseCollection(source), false);
    assert.equal(sourceSetsSubscriptionUpdateItems(source), false);
    assert.equal(fields.hasPauseSubscriptionTool, false);
    assert.equal(fields.callsSubscriptionsUpdate, false);
    assert.equal(fields.handlesPauseSubscriptionTool, false);
    assert.equal(fields.setsPauseCollection, false);
    assert.equal(
      recurringBillingCannotBePausedOrChanged(
        fields.hasPauseSubscriptionTool,
        fields.callsSubscriptionsUpdate
      ),
      true
    );
  });

  it('Connect can create Checkout subscriptions but never calls subscriptions.update', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const html = readRepo('stripe-connect-sample/public/index.html');
    const route = extractConnectSubscriptionRoute(source);
    const docs = extractDashboardApiDocs(html);
    const fields = inspectSubscriptionPausePlanChangeGap(source);

    assert.match(route, /app\.post\('\/api\/subscriptions'/);
    assert.match(route, /mode:\s*['"]subscription['"]/);
    assert.match(route, /sessionId:\s*session\.id/);
    assert.doesNotMatch(route, /subscriptions\.update/);
    assert.doesNotMatch(route, /pause_collection/);
    assert.equal(sourceCallsSubscriptionsUpdate(source), false);
    assert.equal(sourceSetsPauseCollection(source), false);
    assert.equal(sourceSetsSubscriptionUpdateItems(source), false);
    assert.equal(fields.callsSubscriptionsUpdate, false);
    assert.equal(fields.setsPauseCollection, false);
    assert.equal(fields.hasPauseSubscriptionTool, false);
    assert.equal(
      recurringBillingCannotBePausedOrChanged(
        fields.hasPauseSubscriptionTool,
        fields.callsSubscriptionsUpdate
      ),
      true
    );
    // inbound updated/paused events are not an outbound update API
    assert.match(source, /customer\.subscription\.updated/);
    assert.doesNotMatch(source, /subscriptions\.update\s*\(/);
    assert.match(docs, /POST \/api\/subscriptions/);
    assert.match(docs, /POST \/api\/billing-portal/);
    assert.equal(dashboardDocumentsPauseOrPlanChangeEndpoint(docs), false);
    assert.equal(dashboardDocumentsPauseOrPlanChangeEndpoint(html), false);
  });
});
