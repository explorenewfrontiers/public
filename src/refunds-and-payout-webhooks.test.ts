import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  dashboardDocumentsWebhookEvent,
  extractClassicWebhookHandler,
  extractDashboardWebhookDocs,
  extractMcpToolRecord,
  inspectMcpRefundTools,
  inspectPayoutWebhookCases,
  mistakenChargesCannotBeReversed,
  sellersNeverLearnPayoutOutcome,
  sourceCallsRefundsCreate,
  sourceDefinesTool,
  sourceHandlesRefundTool,
  webhookHandlesEventType,
} from './refunds-and-payout-webhooks.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP and Connect cannot refund charges; Connect /webhook ignores payouts', () => {
  it('missing refund tools and payout handlers leave mistaken charges stuck and sellers uninformed', () => {
    assert.equal(mistakenChargesCannotBeReversed(false, false), true);
    assert.equal(mistakenChargesCannotBeReversed(true, false), false);
    assert.equal(mistakenChargesCannotBeReversed(false, true), false);
    assert.equal(sellersNeverLearnPayoutOutcome(false, false), true);
    assert.equal(sellersNeverLearnPayoutOutcome(true, false), false);
    assert.equal(sellersNeverLearnPayoutOutcome(false, true), false);

    assert.equal(sourceDefinesTool(`'create_refund': {`, 'create_refund'), true);
    assert.equal(sourceDefinesTool(`'create_payment_intent': {`, 'create_refund'), false);
    assert.equal(sourceCallsRefundsCreate(`await stripe.refunds.create({`), true);
    assert.equal(sourceHandlesRefundTool(`case 'create_refund': {`), true);
    assert.equal(sourceHandlesRefundTool(`case 'create_payment_intent': {`), false);
    assert.equal(
      webhookHandlesEventType(`case 'payout.paid':`, 'payout.paid'),
      true
    );
    assert.equal(
      webhookHandlesEventType(`case 'payout.failed':`, 'payout.paid'),
      false
    );
    assert.equal(
      dashboardDocumentsWebhookEvent('<li>payout.paid</li>', 'payout.paid'),
      true
    );
  });

  it('MCP defines payment-intent/charge tools but no refund tools and never calls refunds.create', () => {
    const source = readRepo('src/index.ts');
    const tools = extractMcpToolRecord(source);
    const fields = inspectMcpRefundTools(source);

    assert.match(tools, /create_payment_intent/);
    assert.match(tools, /list_charges/);
    assert.match(tools, /get_charge/);
    assert.doesNotMatch(tools, /create_refund/);
    assert.doesNotMatch(tools, /list_refunds/);
    assert.doesNotMatch(tools, /get_refund/);
    assert.equal(sourceDefinesTool(tools, 'create_payment_intent'), true);
    assert.equal(sourceDefinesTool(tools, 'create_refund'), false);
    assert.equal(sourceDefinesTool(tools, 'get_refund'), false);
    assert.equal(sourceDefinesTool(tools, 'list_refunds'), false);
    assert.equal(sourceCallsRefundsCreate(source), false);
    assert.equal(sourceHandlesRefundTool(source), false);
    assert.equal(fields.hasCreateRefundTool, false);
    assert.equal(fields.hasGetRefundTool, false);
    assert.equal(fields.hasListRefundsTool, false);
    assert.equal(fields.callsRefundsCreate, false);
    assert.equal(
      mistakenChargesCannotBeReversed(
        fields.hasCreateRefundTool,
        fields.callsRefundsCreate
      ),
      true
    );
  });

  it('Connect never creates refunds and /webhook ignores payout.paid / failed / canceled', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectPayoutWebhookCases(webhook);
    const html = readRepo('stripe-connect-sample/public/index.html');
    const docs = extractDashboardWebhookDocs(html);

    assert.equal(sourceCallsRefundsCreate(source), false);
    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /parseThinEvent/);
    assert.equal(cases.handlesPayoutPaid, false);
    assert.equal(cases.handlesPayoutFailed, false);
    assert.equal(cases.handlesPayoutCanceled, false);
    assert.equal(webhookHandlesEventType(webhook, 'payout.paid'), false);
    assert.equal(webhookHandlesEventType(webhook, 'payout.failed'), false);
    assert.equal(webhookHandlesEventType(webhook, 'payout.canceled'), false);
    assert.equal(
      sellersNeverLearnPayoutOutcome(cases.handlesPayoutPaid, cases.handlesPayoutFailed),
      true
    );
    assert.match(docs, /invoice\.payment_succeeded/);
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'payout.paid'), false);
    assert.equal(dashboardDocumentsWebhookEvent(docs, 'payout.failed'), false);
    assert.doesNotMatch(docs, /payout\.paid/);
    assert.doesNotMatch(docs, /payout\.failed/);
  });
});
