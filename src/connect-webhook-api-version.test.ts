import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  constructEventCallUsesApiVersionOption,
  parseThinEventCallUsesApiVersionOption,
  productionPassesApiVersionToConstructEvent,
  productionPassesApiVersionToParseThinEvent,
} from './connect-webhook-api-version.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect constructEvent omits apiVersion', () => {
  it('does not pass apiVersion to constructEvent or parseThinEvent', () => {
    assert.equal(productionPassesApiVersionToConstructEvent(), false);
    assert.equal(productionPassesApiVersionToParseThinEvent(), false);

    const withVersion =
      "constructEvent(req.body, sig, secret, { apiVersion: '2024-11-20.acacia' })";
    const withoutVersion = "constructEvent(req.body, sig, WEBHOOK_SECRET || '')";
    assert.equal(constructEventCallUsesApiVersionOption(withVersion), true);
    assert.equal(constructEventCallUsesApiVersionOption(withoutVersion), false);

    const thinWith =
      "parseThinEvent(req.body, sig, secret, { apiVersion: '2024-11-20.acacia' })";
    const thinWithout = "parseThinEvent(req.body, sig, WEBHOOK_SECRET || '')";
    assert.equal(parseThinEventCallUsesApiVersionOption(thinWith), true);
    assert.equal(parseThinEventCallUsesApiVersionOption(thinWithout), false);
  });
});

describe('Connect webhook apiVersion source stays aligned', () => {
  it('calls constructEvent and parseThinEvent with three arguments only', () => {
    const connect = readRepo('stripe-connect-sample/server.ts');

    const webhookStart = connect.indexOf("app.post(\n  '/webhook'");
    const webhookEnd = connect.indexOf('// V2 WEBHOOK HANDLING', webhookStart);
    const webhook = connect.slice(webhookStart, webhookEnd);

    assert.match(
      webhook,
      /constructEvent\(\s*req\.body,\s*sig,\s*WEBHOOK_SECRET \|\| ''\s*\)/
    );
    assert.equal(webhook.includes('apiVersion'), false);

    const thinStart = connect.indexOf("app.post(\n  '/webhook/thin'");
    const thin = connect.slice(thinStart);
    assert.match(
      thin,
      /parseThinEvent\(\s*req\.body,\s*sig,\s*WEBHOOK_SECRET \|\| ''\s*\)/
    );
    assert.equal(thin.includes('apiVersion'), false);

    assert.equal(constructEventCallUsesApiVersionOption(webhook), false);
    assert.equal(parseThinEventCallUsesApiVersionOption(thin), false);
  });
});
