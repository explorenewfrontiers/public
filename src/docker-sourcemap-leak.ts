/**
 * Root and Connect tsconfigs emit sourceMap + declarationMap. Both
 * Dockerfiles COPY the entire dist/ tree into the runtime image and never
 * delete *.map. A production image therefore ships original TypeScript
 * (webhook verification, API-key handling) next to the compiled JS.
 *
 * Open coverage PRs lock root Docker copying prebuilt dist (#14) and
 * running as root with no HEALTHCHECK (#44). They do not lock that tsc
 * source maps are copied into the image.
 */

export interface CompilerOptionsMaps {
  sourceMap?: boolean;
  declarationMap?: boolean;
  inlineSourceMap?: boolean;
}

export function tsconfigEmitsSourceMaps(options: CompilerOptionsMaps): boolean {
  return (
    options.sourceMap === true ||
    options.inlineSourceMap === true ||
    options.declarationMap === true
  );
}

export function dockerfileCopiesEntireDist(dockerfile: string): boolean {
  return (
    /COPY\s+dist\s+\.\/dist/.test(dockerfile) ||
    /COPY\s+--from=\S+\s+\S*dist\s+\.\/dist/.test(dockerfile)
  );
}

export function dockerfileStripsSourceMaps(dockerfile: string): boolean {
  return /\.map/.test(dockerfile);
}

export function dockerignoreExcludesMaps(dockerignore: string): boolean {
  return /(?:^|\n)\s*\*\.js\.map\s*(?:\n|$)/.test(dockerignore) ||
    /(?:^|\n)\s*\*\.map\s*(?:\n|$)/.test(dockerignore);
}

export function productionImageWouldShipMaps(args: {
  sourceMap: boolean;
  copiesEntireDist: boolean;
  stripsMaps: boolean;
}): boolean {
  return args.sourceMap && args.copiesEntireDist && !args.stripsMaps;
}

export function parseTsconfigCompilerOptions(tsconfigJson: string): CompilerOptionsMaps {
  const parsed: unknown = JSON.parse(tsconfigJson);
  if (typeof parsed !== 'object' || parsed === null || !('compilerOptions' in parsed)) {
    return {};
  }
  const compilerOptions = (parsed as { compilerOptions?: unknown }).compilerOptions;
  if (typeof compilerOptions !== 'object' || compilerOptions === null) {
    return {};
  }
  const options = compilerOptions as {
    sourceMap?: unknown;
    declarationMap?: unknown;
    inlineSourceMap?: unknown;
  };
  const result: CompilerOptionsMaps = {};
  if (typeof options.sourceMap === 'boolean') {
    result.sourceMap = options.sourceMap;
  }
  if (typeof options.declarationMap === 'boolean') {
    result.declarationMap = options.declarationMap;
  }
  if (typeof options.inlineSourceMap === 'boolean') {
    result.inlineSourceMap = options.inlineSourceMap;
  }
  return result;
}
