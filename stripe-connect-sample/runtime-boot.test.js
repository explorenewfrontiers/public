import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = dirname(fileURLToPath(import.meta.url));

describe('Connect sample runtime boot (Heroku + Compose)', () => {
  it('Procfile starts compiled JS and does not invoke tsc at dyno boot', () => {
    const procfile = readFileSync(join(root, 'Procfile'), 'utf8');
    const web = procfile
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('web:'));

    assert.ok(web, 'Procfile must declare a web process');
    assert.match(web, /npm start|node dist\/server\.js/);
    assert.doesNotMatch(
      web,
      /npm run build|tsc\b|ts-node/,
      'Heroku prunes typescript after slug compile; runtime must not call tsc'
    );
  });

  it('docker-compose does not overlay an empty host dist/ on the image', () => {
    const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');
    assert.doesNotMatch(
      compose,
      /(?:^|\n)\s*-\s*\.\/dist:\/app\/dist\b/,
      'bind-mounting ./dist over /app/dist hides the image build when the host dist is missing or empty'
    );
  });
});
