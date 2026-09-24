import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  isOnboardingComplete,
  onboardingCompleteFromAccount,
} from './connect-onboarding-absent.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect onboardingComplete when requirements are absent', () => {
  it('is complete for undefined, empty summary, and non-due statuses', () => {
    assert.equal(isOnboardingComplete(undefined), true);
    assert.equal(onboardingCompleteFromAccount({}), true);
    assert.equal(onboardingCompleteFromAccount({ requirements: {} }), true);
    assert.equal(onboardingCompleteFromAccount({ requirements: { summary: {} } }), true);
    assert.equal(isOnboardingComplete('eventually_due'), true);
    assert.equal(isOnboardingComplete('pending_verification'), true);
  });

  it('is incomplete only for currently_due and past_due', () => {
    assert.equal(isOnboardingComplete('currently_due'), false);
    assert.equal(isOnboardingComplete('past_due'), false);
    assert.equal(
      onboardingCompleteFromAccount({
        requirements: { summary: { minimum_deadline: { status: 'currently_due' } } },
      }),
      false
    );
    assert.equal(
      onboardingCompleteFromAccount({
        requirements: { summary: { minimum_deadline: { status: 'past_due' } } },
      }),
      false
    );
  });
});

describe('Connect onboarding-absent source stays aligned', () => {
  it('derives onboardingComplete from a two-way status inequality', () => {
    const server = readRepo('stripe-connect-sample/server.ts');

    assert.match(
      server,
      /const requirementsStatus =\s*account\.requirements\?\.summary\?\.minimum_deadline\?\.status;/
    );
    assert.match(
      server,
      /const onboardingComplete =\s*requirementsStatus !== 'currently_due' &&\s*requirementsStatus !== 'past_due';/
    );
    assert.equal(server.includes("requirementsStatus === 'complete'"), false);
    assert.equal(server.includes('currentlyDueRequirements.length'), false);
  });
});
