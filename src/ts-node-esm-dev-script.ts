/**
 * README documents `npm run dev` / `npm run dev:web`. Both scripts are
 * `ts-node src/*.ts` while package.json is `"type": "module"` and tsconfig
 * has no `ts-node.esm`. ts-node without `--esm` / `ts-node/esm` fails with
 * ERR_UNKNOWN_FILE_EXTENSION on `.ts` in an ESM package, so the documented
 * local path never reaches Stripe.
 *
 * Connect's `dev` script is `ts-node src/server.ts`, but `server.ts` lives
 * at the package root and tsconfig `include` is `src/**` — a second boot
 * miss on the documented sample.
 *
 * Open coverage PRs lock Docker/tsconfig layout (#12, #36), Heroku tsc
 * prune (#58), and missing dotenv (#55). They do not lock the ESM ts-node
 * loader gap on the documented npm run dev path.
 */

export interface PackageJsonLite {
  type?: string;
  scripts?: Record<string, string>;
}

export interface TsconfigLite {
  'ts-node'?: { esm?: boolean; experimentalSpecifierResolution?: string };
  compilerOptions?: { module?: string };
}

export function packageIsNativeEsm(pkg: PackageJsonLite): boolean {
  return pkg.type === 'module';
}

export function tsNodeScriptHasEsmSupport(script: string): boolean {
  if (/\btsx\b/.test(script)) {
    return true;
  }
  if (/--esm\b/.test(script)) {
    return true;
  }
  if (/ts-node\/esm/.test(script)) {
    return true;
  }
  if (/node\s+--loader\s+ts-node/.test(script)) {
    return true;
  }
  return false;
}

export function tsconfigEnablesTsNodeEsm(tsconfig: TsconfigLite): boolean {
  return tsconfig['ts-node']?.esm === true;
}

export function documentedDevScriptWouldFailOnEsm(args: {
  isEsm: boolean;
  scriptHasEsmSupport: boolean;
  tsconfigEsm: boolean;
}): boolean {
  return args.isEsm && !args.scriptHasEsmSupport && !args.tsconfigEsm;
}

export function scriptPointsAtMissingEntry(args: {
  script: string;
  existingRelativePaths: string[];
}): boolean {
  const match = args.script.match(/ts-node\s+(\S+\.ts)/);
  if (!match) {
    return false;
  }
  const target = match[1].replace(/^\.\//, '');
  return !args.existingRelativePaths.includes(target);
}
