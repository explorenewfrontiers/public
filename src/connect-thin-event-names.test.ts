import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  DASHBOARD_DOCUMENTED_THIN_EVENTS,
  SERVER_COMMENT_THIN_EVENTS,
  THIN_WEBHOOK_SWITCH_TYPES,
  thinSwitchHandles,
} from './connect-thin-event-names.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Connect thin-event names: dashboard vs switch', () => {
  it('documented v2.account[...] names do not match handled v2.core.account[...] cases', () => {
    for (const documented of DASHBOARD_DOCUMENTED_THIN_EVENTS) {
      assert.equal(thinSwitchHandles(documented), false);
      assert.equal(documented.includes('v2.core.'), false);
    }
    for (const handled of THIN_WEBHOOK_SWITCH_TYPES) {
      assert.equal(thinSwitchHandles(handled), true);
      assert.equal(handled.startsWith('v2.core.account'), true);
    }
    assert.equal(
      thinSwitchHandles('v2.account[configuration.customer].capability_status_updated'),
      false
    );
    assert.equal(
      thinSwitchHandles('v2.core.account[configuration.customer].capability_status_updated'),
      false
    );
  });
});

describe('Connect thin-event name source stays aligned', () => {
  it('dashboard and comments omit .core while the switch requires it', () => {
    const server = readRepo('stripe-connect-sample/server.ts');
    const dashboard = readRepo('stripe-connect-sample/public/index.html');

    const switchStart = server.indexOf('switch (event.type)');
    const thinSwitchStart = server.lastIndexOf('switch (event.type)');
    const thinSwitch = server.slice(thinSwitchStart);

    assert.ok(switchStart >= 0);
    assert.ok(thinSwitchStart > switchStart);

    for (const handled of THIN_WEBHOOK_SWITCH_TYPES) {
      assert.equal(thinSwitch.includes(`case '${handled}':`), true);
    }

    for (const documented of DASHBOARD_DOCUMENTED_THIN_EVENTS) {
      assert.equal(dashboard.includes(documented), true);
      assert.equal(thinSwitch.includes(`case '${documented}':`), false);
    }

    for (const commented of SERVER_COMMENT_THIN_EVENTS) {
      assert.equal(server.includes(commented), true);
    }

    assert.match(
      dashboard,
      /v2\.account\[requirements\]\.updated \(thin events\)/
    );
    assert.match(
      dashboard,
      /v2\.account\[configuration\.merchant\]\.capability_status_updated \(thin\)/
    );
  });
});
