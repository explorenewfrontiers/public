import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  GITHUB_ACTIONS_WORKFLOWS_DIR,
  githubDiscoversNestedPackageWorkflows,
  NESTED_CONNECT_WORKFLOW,
} from './github-actions-discovery.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('GitHub Actions workflow discovery', () => {
  it('keeps the Connect deploy workflow only under the sample package', () => {
    assert.equal(githubDiscoversNestedPackageWorkflows(), false);
    assert.equal(
      fs.existsSync(path.join(repoRoot, NESTED_CONNECT_WORKFLOW)),
      true
    );
    assert.equal(fs.existsSync(path.join(repoRoot, GITHUB_ACTIONS_WORKFLOWS_DIR)), false);
    assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'workflows', 'deploy.yml')), false);
  });

  it('nested workflow is configured to run on main but GitHub will not load it', () => {
    const workflow = fs.readFileSync(
      path.join(repoRoot, NESTED_CONNECT_WORKFLOW),
      'utf8'
    );
    assert.match(workflow, /branches:\s*\n\s*-\s*main/);
    assert.match(workflow, /context: \.\/stripe-connect-sample/);
    assert.equal(NESTED_CONNECT_WORKFLOW.startsWith('.github/'), false);
  });
});
