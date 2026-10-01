import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

describe('Connect sample deploy layout', () => {
  it('tsconfig compiles the package-root server.ts (not a missing src/ tree)', () => {
    const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8'));
    const include = tsconfig.include;
    assert.ok(Array.isArray(include), 'tsconfig.include must be an array');
    assert.ok(
      include.some((pattern) => pattern === 'server.ts' || pattern.endsWith('/server.ts')),
      `tsconfig.include must contain server.ts, got ${JSON.stringify(include)}`
    );
    assert.equal(
      tsconfig.compilerOptions.rootDir,
      '.',
      'rootDir must be the package root so server.ts is in the compilation'
    );
  });

  it('package scripts start the compiled server at dist/server.js', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.match(pkg.scripts.start, /dist\/server\.js/);
    assert.doesNotMatch(
      pkg.scripts.dev,
      /src\/server\.ts/,
      'dev must not point at the non-existent src/server.ts'
    );
  });

  it('Dockerfile copies server.ts instead of a missing src/ directory', () => {
    const dockerfile = readFileSync(join(root, 'Dockerfile'), 'utf8');
    assert.match(dockerfile, /COPY server\.ts/);
    assert.doesNotMatch(dockerfile, /COPY src /);
  });

  it('tsc emits dist/server.js so npm start can boot', () => {
    execFileSync('npx', ['tsc', '--pretty', 'false'], { cwd: root, stdio: 'pipe' });
    assert.ok(
      existsSync(join(root, 'dist/server.js')),
      'expected dist/server.js after tsc'
    );
  });

  it('compiled server resolves public/ without the ESM-undefined __dirname global', () => {
    const compiled = readFileSync(join(root, 'dist/server.js'), 'utf8');
    assert.doesNotMatch(
      compiled,
      /sendFile\(__dirname/,
      'native ESM has no __dirname; GET / would throw ReferenceError'
    );
    assert.match(compiled, /fileURLToPath/);
    assert.match(compiled, /publicDir/);
  });
});
