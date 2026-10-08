import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  listToolRequiresCustomerScope,
  productionListChargesRequiresScope,
  productionListCustomersRequiresScope,
  productionListInvoicesRequiresScope,
} from './mcp-list-unscoped.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP list tools dump the account without a customer scope', () => {
  it('treats an empty required array as unscoped', () => {
    assert.equal(listToolRequiresCustomerScope([]), false);
    assert.equal(listToolRequiresCustomerScope(['limit']), false);
    assert.equal(listToolRequiresCustomerScope(['customer']), true);
    assert.equal(listToolRequiresCustomerScope(['customer_id']), true);
    assert.equal(productionListCustomersRequiresScope(), false);
    assert.equal(productionListChargesRequiresScope(), false);
    assert.equal(productionListInvoicesRequiresScope(), false);
  });
});

describe('MCP list tool source stays aligned', () => {
  it('declares required: [] and returns the raw Stripe list for customers/charges/invoices', () => {
    const source = readRepo('src/index.ts');

    const customersTool = source.slice(
      source.indexOf("'list_customers'"),
      source.indexOf("'get_customer'")
    );
    const chargesTool = source.slice(
      source.indexOf("'list_charges'"),
      source.indexOf("'get_charge'")
    );
    const invoicesTool = source.slice(
      source.indexOf("'list_invoices'"),
      source.indexOf("'get_invoice'")
    );

    assert.match(customersTool, /required: \[\],/);
    assert.match(chargesTool, /required: \[\],/);
    assert.match(invoicesTool, /required: \[\],/);
    assert.equal(listToolRequiresCustomerScope([]), false);

    const customersCall = source.slice(
      source.indexOf("case 'list_customers'"),
      source.indexOf("case 'get_customer'")
    );
    const chargesCall = source.slice(
      source.indexOf("case 'list_charges'"),
      source.indexOf("case 'get_charge'")
    );
    const invoicesCall = source.slice(
      source.indexOf("case 'list_invoices'"),
      source.indexOf("case 'get_invoice'")
    );
    const productsCall = source.slice(
      source.indexOf("case 'list_products'"),
      source.indexOf("case 'get_product'")
    );

    assert.match(customersCall, /return customers;/);
    assert.match(chargesCall, /return charges;/);
    assert.match(invoicesCall, /return invoices;/);
    assert.match(productsCall, /products: products\.map/);
    assert.equal(customersCall.includes('if (!input.customer)'), false);
    assert.equal(productionListCustomersRequiresScope(), false);
    assert.equal(productionListChargesRequiresScope(), false);
    assert.equal(productionListInvoicesRequiresScope(), false);
  });
});
