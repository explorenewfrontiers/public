/**
 * Connect and catalog Express apps parse JSON with `bodyParser.json()` /
 * `express.json()` and Connect also uses `urlencoded({ extended: true })`.
 * Neither call sets `inflate: false` or an explicit `limit` /
 * `parameterLimit`. body-parser defaults are inflate:true and 100kb, so a
 * gzip/deflate body on POST /api/checkout or /api/accounts is inflated
 * before Stripe sees it. qs will also accept up to 1000 parameters.
 *
 * Open coverage PRs lock MCP's uncapped `body += chunk` (#28) and nested
 * urlencoded objects bypassing truthy guards (#57). They do not lock that
 * the Express money parsers still inflate compressed bodies with default
 * limits.
 */

export interface JsonParserOptions {
  inflate?: boolean;
  limit?: string | number;
}

export interface UrlencodedParserOptions {
  extended?: boolean;
  inflate?: boolean;
  limit?: string | number;
  parameterLimit?: number;
}

/** body-parser / express.json defaults when options are omitted. */
export const BODY_PARSER_DEFAULT_INFLATE = true;
export const BODY_PARSER_DEFAULT_LIMIT = '100kb';
export const URLENCODED_DEFAULT_PARAMETER_LIMIT = 1000;

export function jsonParserInflatesCompressedBodies(
  options: JsonParserOptions | undefined
): boolean {
  if (options === undefined) {
    return BODY_PARSER_DEFAULT_INFLATE;
  }
  if (options.inflate === false) {
    return false;
  }
  return true;
}

export function jsonParserHasExplicitByteLimit(
  options: JsonParserOptions | undefined
): boolean {
  if (options === undefined) {
    return false;
  }
  return options.limit !== undefined;
}

export function urlencodedHasExplicitParameterLimit(
  options: UrlencodedParserOptions | undefined
): boolean {
  if (options === undefined) {
    return false;
  }
  return typeof options.parameterLimit === 'number';
}

export function compressedMoneyPostWouldInflate(args: {
  inflates: boolean;
  hasExplicitLimit: boolean;
}): boolean {
  return args.inflates && !args.hasExplicitLimit;
}

export function sourceRegistersBareJsonParser(source: string): boolean {
  return /bodyParser\.json\(\s*\)/.test(source) || /express\.json\(\s*\)/.test(source);
}

export function sourceRegistersExtendedUrlencodedWithoutParameterLimit(
  source: string
): boolean {
  if (!/urlencoded\(\s*\{\s*extended:\s*true\s*\}\s*\)/.test(source)) {
    return false;
  }
  return !/parameterLimit\s*:/.test(source);
}

export function extractMiddlewareSetup(source: string): string {
  const jsonIdx = source.search(/bodyParser\.json|express\.json|urlencoded\(/);
  if (jsonIdx < 0) {
    return '';
  }
  const fromMiddleware = source.slice(jsonIdx);
  const firstRoute = fromMiddleware.search(/\napp\.(get|post)\(/);
  if (firstRoute < 0) {
    return fromMiddleware.slice(0, 1500);
  }
  return fromMiddleware.slice(0, firstRoute);
}
