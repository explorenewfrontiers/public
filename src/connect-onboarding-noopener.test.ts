import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  productionSetsOnboardingNoopener,
  sourceInterpolatesOnboardingHref,
  targetBlankLinksHaveNoopener,
  targetBlankOpenTags,
} from './connect-onboarding-noopener.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect onboarding link opens without rel=noopener', () => {
  it('dashboard interpolates linkResult.url into target=_blank with no rel', () => {
    const html = readRepo('stripe-connect-sample/public/index.html');
    assert.equal(sourceInterpolatesOnboardingHref(html), true);

    const tags = targetBlankOpenTags(html);
    assert.equal(tags.length, 1);
    assert.match(tags[0] ?? '', /href="\$\{linkResult\.url\}"/);
    assert.match(tags[0] ?? '', /target="_blank"/);
    assert.equal(/\brel\s*=/i.test(tags[0] ?? ''), false);
    assert.equal(targetBlankLinksHaveNoopener(html), false);
    assert.equal(productionSetsOnboardingNoopener(), false);
  });

  it('catalog and Connect storefront do not open target=_blank tabs', () => {
    assert.deepEqual(targetBlankOpenTags(readRepo('public/index.html')), []);
    assert.deepEqual(
      targetBlankOpenTags(readRepo('stripe-connect-sample/public/storefront.html')),
      []
    );
    assert.equal(targetBlankLinksHaveNoopener(readRepo('public/index.html')), false);
  });
});
