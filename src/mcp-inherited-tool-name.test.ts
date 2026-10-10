import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  INHERITED_OBJECT_TOOL_NAMES,
  isOwnRegisteredTool,
  productionTreatsNameAsRegisteredTool,
  productionUsesHasOwnForToolLookup,
} from './mcp-inherited-tool-name.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('MCP tool lookup treats inherited Object keys as registered tools', () => {
  it('plain tools objects are truthy for constructor, toString, and __proto__', () => {
    const tools: Record<string, unknown> = {
      list_customers: { name: 'list_customers' },
    };

    assert.equal(productionTreatsNameAsRegisteredTool(tools, 'list_customers'), true);
    assert.equal(isOwnRegisteredTool(tools, 'list_customers'), true);

    for (const name of INHERITED_OBJECT_TOOL_NAMES) {
      assert.equal(
        productionTreatsNameAsRegisteredTool(tools, name),
        true,
        `production lookup should treat inherited ${name} as present`
      );
      assert.equal(isOwnRegisteredTool(tools, name), false);
    }

    assert.equal(productionTreatsNameAsRegisteredTool(tools, 'not_a_tool'), false);
    assert.equal(isOwnRegisteredTool(tools, ''), false);
    assert.equal(productionTreatsNameAsRegisteredTool(tools, ''), false);
  });

  it('Object.values lists only own tools while inherited names stay callable', () => {
    const tools: Record<string, unknown> = {
      create_payment_intent: { name: 'create_payment_intent' },
    };
    const listed = Object.values(tools).map((tool) => {
      const record = tool as { name: string };
      return record.name;
    });
    assert.deepEqual(listed, ['create_payment_intent']);
    assert.equal(listed.includes('constructor'), false);
    assert.equal(productionTreatsNameAsRegisteredTool(tools, 'constructor'), true);
  });
});

describe('MCP tool lookup source stays aligned', () => {
  it('call_tool uses tools[params.name] without hasOwn', () => {
    const source = readRepo('src/index.ts');
    const start = source.indexOf("case 'call_tool'");
    const end = source.indexOf('default:', start);
    const body = source.slice(start, end);

    assert.match(body, /if \(!params\.name \|\| !tools\[params\.name\]\)/);
    assert.equal(productionUsesHasOwnForToolLookup(body), false);
    assert.equal(body.includes('Object.hasOwn'), false);
    assert.equal(source.includes('Object.values(tools)'), true);
  });
});
