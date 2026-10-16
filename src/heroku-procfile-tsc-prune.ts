/**
 * Connect Procfile is `web: npm run build && npm start`. The Node
 * buildpack compiles during slug compile, then prunes devDependencies
 * (typescript/tsc) before dyno boot. There is no heroku-postbuild
 * script, and typescript is only a devDependency. Documented Heroku
 * deploys (`git push heroku main`, GH Actions heroku-deploy) therefore
 * exit with `tsc: not found` and never listen on PORT.
 *
 * Open bugfix PR #43 changes the Procfile; its tests live on that
 * branch. Open coverage PRs lock Docker COPY src (#12/#36) and Compose
 * overlaying dist (#15). They do not lock Procfile compile-at-boot vs
 * pruned tsc on main.
 */

export interface PackageJsonScripts {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function procfileCompilesTypeScriptAtBoot(procfile: string): boolean {
  const webLine = procfile
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('web:'));
  if (webLine === undefined) {
    return false;
  }
  return /npm run build/.test(webLine) || /\btsc\b/.test(webLine);
}

export function typescriptOnlyInDevDependencies(pkg: PackageJsonScripts): boolean {
  const inDev =
    pkg.devDependencies !== undefined &&
    Object.prototype.hasOwnProperty.call(pkg.devDependencies, 'typescript');
  const inProd =
    pkg.dependencies !== undefined &&
    Object.prototype.hasOwnProperty.call(pkg.dependencies, 'typescript');
  return inDev && !inProd;
}

export function hasHerokuPostbuild(pkg: PackageJsonScripts): boolean {
  return (
    pkg.scripts !== undefined &&
    Object.prototype.hasOwnProperty.call(pkg.scripts, 'heroku-postbuild')
  );
}

export function productionDynoWouldMissTsc(args: {
  compilesAtBoot: boolean;
  typescriptOnlyDev: boolean;
  hasHerokuPostbuild: boolean;
}): boolean {
  return args.compilesAtBoot && args.typescriptOnlyDev && !args.hasHerokuPostbuild;
}

export function workflowDeploysConnectToHeroku(workflowYaml: string): boolean {
  return (
    /heroku-deploy/.test(workflowYaml) &&
    /appdir:\s*["']stripe-connect-sample["']/.test(workflowYaml)
  );
}
