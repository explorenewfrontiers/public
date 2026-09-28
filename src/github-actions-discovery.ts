/**
 * Mirrors where the Connect deploy workflow actually lives.
 *
 * Open PR #15 reads stripe-connect-sample/.github/workflows/deploy.yml
 * and locks the Docker build context. GitHub Actions only loads
 * workflows from the repository-root `.github/workflows/` directory.
 * A nested workflow under the sample package is never scheduled on
 * push to main, so the documented production deploy path is dead.
 */

export const NESTED_CONNECT_WORKFLOW = 'stripe-connect-sample/.github/workflows/deploy.yml';

export const GITHUB_ACTIONS_WORKFLOWS_DIR = '.github/workflows';

export function githubDiscoversNestedPackageWorkflows(): boolean {
  return false;
}
