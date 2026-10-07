import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  CHARGE_PII_FIELDS,
  CUSTOMER_PII_FIELDS,
  INVOICE_PII_FIELDS,
  mcpToolResultText,
  productionRedactsChargePii,
  productionRedactsCustomerPii,
  productionRedactsInvoicePii,
  textIncludesAny,
} from './mcp-retrieve-pii-redaction.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP retrieve tools stringify customer/charge/invoice PII', () => {
  it('includes customer email, phone, and address in the tool result text', () => {
    const text = mcpToolResultText({
      id: 'cus_1',
      object: 'customer',
      email: 'buyer@example.com',
      phone: '+15555550100',
      name: 'Ada Lovelace',
      address: { line1: '123 Main St', city: 'Palo Alto', postal_code: '94301' },
      shipping: { name: 'Ada Lovelace', address: { line1: '123 Main St' } },
    });

    assert.equal(
      textIncludesAny(text, [
        'buyer@example.com',
        '+15555550100',
        '123 Main St',
        'Ada Lovelace',
      ]),
      true
    );
    for (const field of CUSTOMER_PII_FIELDS) {
      assert.match(text, new RegExp(`"${field}"`));
    }
    assert.equal(productionRedactsCustomerPii(), false);
  });

  it('includes charge receipt email and payment-method details', () => {
    const text = mcpToolResultText({
      id: 'ch_1',
      object: 'charge',
      receipt_email: 'payer@example.com',
      billing_details: { name: 'Ada', email: 'payer@example.com' },
      payment_method_details: { card: { last4: '4242', fingerprint: 'fp_secret' } },
    });

    assert.equal(
      textIncludesAny(text, ['payer@example.com', '4242', 'fp_secret']),
      true
    );
    for (const field of CHARGE_PII_FIELDS) {
      assert.match(text, new RegExp(`"${field}"`));
    }
    assert.equal(productionRedactsChargePii(), false);
  });

  it('includes invoice customer email and hosted PDF URLs', () => {
    const text = mcpToolResultText({
      id: 'in_1',
      object: 'invoice',
      customer_email: 'accounts@example.com',
      customer_name: 'Ada Lovelace',
      hosted_invoice_url: 'https://invoice.stripe.com/i/hosted',
      invoice_pdf: 'https://pay.stripe.com/invoice/inv_pdf',
    });

    assert.equal(
      textIncludesAny(text, [
        'accounts@example.com',
        'https://invoice.stripe.com/i/hosted',
        'https://pay.stripe.com/invoice/inv_pdf',
      ]),
      true
    );
    for (const field of INVOICE_PII_FIELDS) {
      assert.match(text, new RegExp(`"${field}"`));
    }
    assert.equal(productionRedactsInvoicePii(), false);
  });
});

describe('MCP retrieve PII source stays aligned', () => {
  it('returns raw customer/charge/invoice objects and stringifies them', () => {
    const mcp = readRepo('src/index.ts');

    const getCustomer = mcp.slice(
      mcp.indexOf("case 'get_customer'"),
      mcp.indexOf("case 'create_customer'")
    );
    assert.match(getCustomer, /customers\.retrieve\(/);
    assert.match(getCustomer, /return customer;/);
    assert.equal(getCustomer.includes('email'), false);

    const getCharge = mcp.slice(
      mcp.indexOf("case 'get_charge'"),
      mcp.indexOf("case 'create_payment_intent'")
    );
    assert.match(getCharge, /charges\.retrieve\(/);
    assert.match(getCharge, /return charge;/);

    const getInvoice = mcp.slice(
      mcp.indexOf("case 'get_invoice'"),
      mcp.indexOf("case 'list_products'")
    );
    assert.match(getInvoice, /invoices\.retrieve\(/);
    assert.match(getInvoice, /return invoice;/);

    const listProducts = mcp.slice(
      mcp.indexOf("case 'list_products'"),
      mcp.indexOf("case 'get_product'")
    );
    assert.match(listProducts, /products: products\.map/);
    assert.match(listProducts, /id: p\.id/);
    assert.equal(listProducts.includes('email'), false);

    const callTool = mcp.slice(
      mcp.indexOf("case 'call_tool'"),
      mcp.indexOf("default:\n        return {\n          jsonrpc: '2.0'")
    );
    assert.match(callTool, /JSON\.stringify\(result, null, 2\)/);
    assert.equal(callTool.includes('redact'), false);
    assert.equal(callTool.includes('customer_email'), false);
  });
});
