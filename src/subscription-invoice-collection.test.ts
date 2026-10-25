import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  b2bInvoiceBillingImpossible,
  extractSubscriptionCheckoutCreates,
  inspectSubscriptionInvoiceCollection,
  netTermsCannotBeSet,
  sourceCallsSubscriptionsCreate,
  sourceSetsCollectionMethod,
  sourceSetsDaysUntilDue,
  sourceSetsPaymentMethodCollection,
  sourceSetsPaymentMethodCollectionIfRequired,
  sourceSetsSendInvoice,
  subscriptionAlwaysRequiresCard,
} from './subscription-invoice-collection.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect subscriptions cannot send invoices or skip the card', () => {
  it('send_invoice + days_until_due require subscriptions.create; default collection always takes a card', () => {
    assert.equal(b2bInvoiceBillingImpossible(false, false), true);
    assert.equal(b2bInvoiceBillingImpossible(true, false), true);
    assert.equal(b2bInvoiceBillingImpossible(true, true), false);
    assert.equal(netTermsCannotBeSet(false), true);
    assert.equal(netTermsCannotBeSet(true), false);
    assert.equal(subscriptionAlwaysRequiresCard(false), true);
    assert.equal(subscriptionAlwaysRequiresCard(true, 'always'), true);
    assert.equal(subscriptionAlwaysRequiresCard(true, 'if_required'), false);

    assert.equal(sourceCallsSubscriptionsCreate(`subscriptions.create({`), true);
    assert.equal(
      sourceSetsCollectionMethod(`collection_method: 'charge_automatically'`),
      true
    );
    assert.equal(
      sourceSetsSendInvoice(`collection_method: 'send_invoice'`),
      true
    );
    assert.equal(
      sourceSetsSendInvoice(`collection_method: 'charge_automatically'`),
      false
    );
    assert.equal(sourceSetsDaysUntilDue(`days_until_due: 30`), true);
    assert.equal(
      sourceSetsPaymentMethodCollection(`payment_method_collection: 'always'`),
      true
    );
    assert.equal(
      sourceSetsPaymentMethodCollectionIfRequired(
        `payment_method_collection: 'if_required'`
      ),
      true
    );
    assert.equal(
      sourceSetsPaymentMethodCollectionIfRequired(
        `payment_method_collection: 'always'`
      ),
      false
    );
  });

  it('Connect has no subscriptions.create and Checkout subscription omits send_invoice fields', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const subscriptionCheckout = extractSubscriptionCheckoutCreates(source);
    const fields = inspectSubscriptionInvoiceCollection(source);

    assert.match(subscriptionCheckout, /checkout\.sessions\.create/);
    assert.match(subscriptionCheckout, /mode:\s*['"]subscription['"]/);
    assert.equal((subscriptionCheckout.match(/checkout\.sessions\.create/g) || []).length, 1);
    assert.equal(sourceCallsSubscriptionsCreate(source), false);
    assert.equal(sourceSetsCollectionMethod(source), false);
    assert.equal(sourceSetsSendInvoice(source), false);
    assert.equal(sourceSetsDaysUntilDue(source), false);
    assert.equal(sourceSetsPaymentMethodCollection(source), false);
    assert.equal(fields.hasSubscriptionsCreate, false);
    assert.equal(fields.hasCollectionMethod, false);
    assert.equal(fields.hasSendInvoice, false);
    assert.equal(fields.hasDaysUntilDue, false);
    assert.equal(fields.hasPaymentMethodCollection, false);
    assert.equal(
      b2bInvoiceBillingImpossible(fields.hasSubscriptionsCreate, fields.hasSendInvoice),
      true
    );
    assert.equal(netTermsCannotBeSet(fields.hasDaysUntilDue), true);
    assert.equal(
      subscriptionAlwaysRequiresCard(fields.hasPaymentMethodCollection),
      true
    );
  });

  it('catalog and MCP have no subscription or send_invoice path either', () => {
    const web = readRepo('src/web-server.ts');
    const mcp = readRepo('src/index.ts');
    const webFields = inspectSubscriptionInvoiceCollection(web);
    const mcpFields = inspectSubscriptionInvoiceCollection(mcp);

    assert.equal(extractSubscriptionCheckoutCreates(web), '');
    assert.equal(webFields.hasSubscriptionsCreate, false);
    assert.equal(webFields.hasSendInvoice, false);
    assert.equal(mcpFields.hasSubscriptionsCreate, false);
    assert.equal(mcpFields.hasSendInvoice, false);
    assert.equal(mcpFields.hasPaymentMethodCollection, false);
    assert.equal(
      b2bInvoiceBillingImpossible(mcpFields.hasSubscriptionsCreate, mcpFields.hasSendInvoice),
      true
    );
  });
});
