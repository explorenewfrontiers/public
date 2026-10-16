import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  BODY_PARSER_DEFAULT_INFLATE,
  BODY_PARSER_DEFAULT_LIMIT,
  URLENCODED_DEFAULT_PARAMETER_LIMIT,
  compressedMoneyPostWouldInflate,
  extractMiddlewareSetup,
  jsonParserHasExplicitByteLimit,
  jsonParserInflatesCompressedBodies,
  sourceRegistersBareJsonParser,
  sourceRegistersExtendedUrlencodedWithoutParameterLimit,
  urlencodedHasExplicitParameterLimit,
} from './express-json-inflate-limit.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepo(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

describe('Express JSON/urlencoded parsers inflate compressed bodies without explicit limits', () => {
  it('omitted parser options inflate gzip and use the 100kb / 1000-parameter defaults', () => {
    assert.equal(BODY_PARSER_DEFAULT_INFLATE, true);
    assert.equal(BODY_PARSER_DEFAULT_LIMIT, '100kb');
    assert.equal(URLENCODED_DEFAULT_PARAMETER_LIMIT, 1000);

    assert.equal(jsonParserInflatesCompressedBodies(undefined), true);
    assert.equal(jsonParserInflatesCompressedBodies({}), true);
    assert.equal(jsonParserInflatesCompressedBodies({ inflate: true }), true);
    assert.equal(jsonParserInflatesCompressedBodies({ inflate: false }), false);

    assert.equal(jsonParserHasExplicitByteLimit(undefined), false);
    assert.equal(jsonParserHasExplicitByteLimit({}), false);
    assert.equal(jsonParserHasExplicitByteLimit({ limit: '10kb' }), true);

    assert.equal(urlencodedHasExplicitParameterLimit(undefined), false);
    assert.equal(urlencodedHasExplicitParameterLimit({ extended: true }), false);
    assert.equal(
      urlencodedHasExplicitParameterLimit({ extended: true, parameterLimit: 20 }),
      true
    );

    assert.equal(
      compressedMoneyPostWouldInflate({ inflates: true, hasExplicitLimit: false }),
      true
    );
    assert.equal(
      compressedMoneyPostWouldInflate({ inflates: false, hasExplicitLimit: false }),
      false
    );
    assert.equal(
      compressedMoneyPostWouldInflate({ inflates: true, hasExplicitLimit: true }),
      false
    );
  });

  it('Connect money parsers are bare json() plus extended urlencoded with no parameterLimit', () => {
    const source = readRepo('stripe-connect-sample/server.ts');
    const middleware = extractMiddlewareSetup(source);

    assert.equal(sourceRegistersBareJsonParser(source), true);
    assert.equal(sourceRegistersExtendedUrlencodedWithoutParameterLimit(source), true);
    assert.match(middleware, /bodyParser\.json\(\s*\)/);
    assert.match(middleware, /urlencoded\(\s*\{\s*extended:\s*true\s*\}\s*\)/);
    assert.equal(/inflate\s*:/.test(middleware), false);
    assert.equal(/parameterLimit\s*:/.test(middleware), false);
    assert.equal(
      compressedMoneyPostWouldInflate({ inflates: true, hasExplicitLimit: false }),
      true
    );
  });

  it('catalog checkout JSON parser is express.json() with no inflate/limit options', () => {
    const source = readRepo('src/web-server.ts');

    assert.equal(sourceRegistersBareJsonParser(source), true);
    assert.match(source, /app\.use\(\s*express\.json\(\s*\)\s*\)/);
    assert.equal(/inflate\s*:/.test(source), false);
    assert.equal(/limit\s*:/.test(source), false);
    assert.match(source, /app\.post\(\s*['"]\/api\/checkout['"]/);
  });
});
