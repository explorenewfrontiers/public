import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  extractBillingPortalCreates,
  extractClassicWebhookHandler,
  finalizedInvoiceCannotAttachTax,
  inspectInvoiceLifecycleCases,
  inspectPortalLocaleFlow,
  portalCannotDeepLink,
  portalIgnoresMerchantLanguage,
  renewalRemindersNeverSent,
  sourceSetsFlowData,
  sourceSetsFlowTypePaymentMethodUpdate,
  sourceSetsFlowTypeSubscriptionCancel,
  sourceSetsPortalLocale,
  voidedInvoiceNeverAdjustsAccess,
  webhookHandlesEventType,
} from './portal-locale-invoice-lifecycle.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Billing portal omits locale/flow_data; webhook ignores invoice lifecycle', () => {
  it('a portal without locale/flow_data follows the browser and cannot deep-link', () => {
    assert.equal(portalIgnoresMerchantLanguage(false), true);
    assert.equal(portalIgnoresMerchantLanguage(true), false);
    assert.equal(portalCannotDeepLink(false), true);
    assert.equal(portalCannotDeepLink(true), false);
    assert.equal(renewalRemindersNeverSent(false), true);
    assert.equal(renewalRemindersNeverSent(true), false);
    assert.equal(finalizedInvoiceCannotAttachTax(false), true);
    assert.equal(finalizedInvoiceCannotAttachTax(true), false);
    assert.equal(voidedInvoiceNeverAdjustsAccess(false), true);
    assert.equal(voidedInvoiceNeverAdjustsAccess(true), false);

    assert.equal(sourceSetsPortalLocale(`locale: 'de'`), true);
    assert.equal(
      sourceSetsFlowData(`flow_data: { type: 'payment_method_update' }`),
      true
    );
    assert.equal(
      sourceSetsFlowTypePaymentMethodUpdate(
        `flow_data: { type: 'payment_method_update' }`
      ),
      true
    );
    assert.equal(
      sourceSetsFlowTypeSubscriptionCancel(
        `flow_data: { type: 'subscription_cancel' }`
      ),
      true
    );
    assert.equal(
      sourceSetsFlowTypePaymentMethodUpdate(
        `flow_data: { type: 'subscription_cancel' }`
      ),
      false
    );
    assert.equal(
      webhookHandlesEventType(`case 'invoice.upcoming':`, 'invoice.upcoming'),
      true
    );
    assert.equal(
      webhookHandlesEventType(`case 'invoice.paid':`, 'invoice.upcoming'),
      false
    );
  });

  it('Connect billing portal omits locale and flow_data', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const portal = extractBillingPortalCreates(source);
    const fields = inspectPortalLocaleFlow(portal);

    assert.match(portal, /billingPortal\.sessions\.create/);
    assert.match(portal, /customer_account/);
    assert.match(portal, /return_url/);
    assert.equal((portal.match(/billingPortal\.sessions\.create/g) || []).length, 1);
    assert.equal(sourceSetsPortalLocale(portal), false);
    assert.equal(sourceSetsFlowData(portal), false);
    assert.equal(fields.hasLocale, false);
    assert.equal(fields.hasFlowData, false);
    assert.equal(portalIgnoresMerchantLanguage(fields.hasLocale), true);
    assert.equal(portalCannotDeepLink(fields.hasFlowData), true);
  });

  it('Connect /webhook handles payment_succeeded but not upcoming, finalized, or voided', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const webhook = extractClassicWebhookHandler(source);
    const cases = inspectInvoiceLifecycleCases(webhook);

    assert.match(webhook, /constructEvent/);
    assert.doesNotMatch(webhook, /parseThinEvent/);
    assert.equal(cases.handlesPaymentSucceeded, true);
    assert.equal(cases.handlesUpcoming, false);
    assert.equal(cases.handlesFinalized, false);
    assert.equal(cases.handlesVoided, false);
    assert.equal(webhookHandlesEventType(webhook, 'invoice.payment_succeeded'), true);
    assert.equal(webhookHandlesEventType(webhook, 'invoice.upcoming'), false);
    assert.equal(webhookHandlesEventType(webhook, 'invoice.finalized'), false);
    assert.equal(webhookHandlesEventType(webhook, 'invoice.voided'), false);
    assert.equal(renewalRemindersNeverSent(cases.handlesUpcoming), true);
    assert.equal(finalizedInvoiceCannotAttachTax(cases.handlesFinalized), true);
    assert.equal(voidedInvoiceNeverAdjustsAccess(cases.handlesVoided), true);
  });
});
