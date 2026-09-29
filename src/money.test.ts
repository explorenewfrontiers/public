import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { fromStripeUnitAmount, toStripeUnitAmount } from './money.js';

describe('toStripeUnitAmount', () => {
  it('converts two-decimal currencies to cents', () => {
    assert.equal(toStripeUnitAmount(10, 'usd'), 1000);
    assert.equal(toStripeUnitAmount(29.99, 'usd'), 2999);
    assert.equal(toStripeUnitAmount(9.99, 'eur'), 999);
    assert.equal(toStripeUnitAmount(1.5, 'gbp'), 150);
  });

  it('does not multiply zero-decimal currencies by 100', () => {
    assert.equal(toStripeUnitAmount(500, 'jpy'), 500);
    assert.equal(toStripeUnitAmount(500, 'JPY'), 500);
    assert.equal(toStripeUnitAmount(1000, 'krw'), 1000);
    assert.equal(toStripeUnitAmount(15000, 'vnd'), 15000);
  });

  it('converts three-decimal currencies with a trailing zero', () => {
    assert.equal(toStripeUnitAmount(5, 'kwd'), 5000);
    assert.equal(toStripeUnitAmount(5.124, 'kwd'), 5120);
  });

  it('defaults missing currency to usd (cents)', () => {
    assert.equal(toStripeUnitAmount(10, undefined), 1000);
    assert.equal(toStripeUnitAmount(10, ''), 1000);
  });

  it('rejects non-finite and negative amounts', () => {
    assert.throws(() => toStripeUnitAmount(NaN, 'usd'), /finite/);
    assert.throws(() => toStripeUnitAmount(-1, 'usd'), /negative/);
  });
});

describe('fromStripeUnitAmount', () => {
  it('inverts two-decimal and zero-decimal conversions', () => {
    assert.equal(fromStripeUnitAmount(1000, 'usd'), 10);
    assert.equal(fromStripeUnitAmount(500, 'jpy'), 500);
    assert.equal(fromStripeUnitAmount(5000, 'kwd'), 5);
  });
});

describe('catalog sync uses currency-aware unit amounts', () => {
  it('does not hardcode price * 100 for Stripe unit_amount', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const srcDir = here.endsWith('dist') ? join(here, '..', 'src') : here;
    const repoRoot = join(srcDir, '..');
    const catalog = readFileSync(join(srcDir, 'catalog.ts'), 'utf8');
    assert.match(catalog, /toStripeUnitAmount/);
    assert.doesNotMatch(
      catalog,
      /unit_amount:\s*Math\.round\(\s*product\.price\s*\*\s*100\s*\)/
    );

    const appJs = readFileSync(join(repoRoot, 'public', 'app.js'), 'utf8');
    assert.match(appJs, /formatStripeMoney/);
    assert.doesNotMatch(appJs, /unit_amount \/ 100\)\.toFixed\(2\)/);

    const storefront = readFileSync(
      join(repoRoot, 'stripe-connect-sample', 'public', 'storefront.html'),
      'utf8'
    );
    assert.match(storefront, /formatStripeMoney/);
    assert.doesNotMatch(storefront, /product\.price \/ 100\)\.toFixed\(2\)/);
  });
});
