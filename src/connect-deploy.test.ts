import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sampleDir = path.join(repoRoot, 'stripe-connect-sample');

function readSample(relPath: string): string {
  return fs.readFileSync(path.join(sampleDir, relPath), 'utf8');
}

describe('Connect sample deployment layout', () => {
  it('keeps server.ts at the package root, not under src/', () => {
    assert.equal(fs.existsSync(path.join(sampleDir, 'server.ts')), true);
    assert.equal(fs.existsSync(path.join(sampleDir, 'src')), false);
  });

  it('Dockerfile copies a src/ tree that is not in the sample', () => {
    const dockerfile = readSample('Dockerfile');
    assert.match(dockerfile, /COPY src \.\/src/);
    assert.match(dockerfile, /COPY tsconfig\.json \.\//);
    assert.match(dockerfile, /RUN npm run build/);
    assert.match(dockerfile, /CMD \["npm", "start"\]/);
  });

  it('TypeScript config only includes src/** while the entrypoint is at the root', () => {
    const tsconfig = JSON.parse(readSample('tsconfig.json')) as {
      compilerOptions: { rootDir: string; outDir: string };
      include: string[];
    };
    const pkg = JSON.parse(readSample('package.json')) as {
      main: string;
      scripts: { build: string; start: string; dev: string };
    };

    assert.equal(tsconfig.compilerOptions.rootDir, './src');
    assert.deepEqual(tsconfig.include, ['src/**/*']);
    assert.equal(pkg.main, 'dist/server.js');
    assert.equal(pkg.scripts.build, 'tsc');
    assert.equal(pkg.scripts.start, 'node dist/server.js');
    assert.equal(pkg.scripts.dev, 'ts-node src/server.ts');
  });

  it('Vercel functions glob points at api/**/*.ts, which does not exist', () => {
    const vercel = JSON.parse(readSample('vercel.json')) as {
      functions: Record<string, unknown>;
      outputDirectory: string;
    };
    assert.ok(vercel.functions['api/**/*.ts']);
    assert.equal(fs.existsSync(path.join(sampleDir, 'api')), false);
    assert.equal(vercel.outputDirectory, 'dist');
  });

  it('Procfile builds then starts the compiled server that tsc cannot emit today', () => {
    assert.equal(readSample('Procfile').trim(), 'web: npm run build && npm start');
  });
});

describe('Connect webhook body parsing', () => {
  it('registers JSON bodyParser before the raw /webhook parsers', () => {
    const source = readSample('server.ts');
    const jsonParser = source.indexOf('app.use(bodyParser.json())');
    const webhookRoute = source.indexOf("app.post(\n  '/webhook'");
    const thinRoute = source.indexOf("app.post(\n  '/webhook/thin'");
    const rawParser = source.indexOf("express.raw({ type: 'application/json' })");

    assert.ok(jsonParser >= 0);
    assert.ok(webhookRoute > jsonParser);
    assert.ok(thinRoute > webhookRoute);
    assert.ok(rawParser > webhookRoute);
    assert.match(source, /stripeClient\.webhooks\.constructEvent\(\s*req\.body/);
    assert.match(source, /stripeClient\.parseThinEvent\(\s*req\.body/);
  });
});
