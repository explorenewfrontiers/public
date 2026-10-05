/**
 * Mirrors stripe-connect-sample/vercel.json versus the Express entrypoint.
 *
 * Open PR #12 locks Docker/tsconfig layout (server.ts at package root, src/
 * include). Open PR #35 locks vercel env values as {description, required}
 * objects. They do not lock that the functions glob (api/ ** / *.ts)
 * matches no files, outputDirectory is static dist/, and there is no
 * rewrite to server.ts — a Vercel deploy cannot serve the Connect API.
 */

export const VERCEL_FUNCTIONS_GLOB = 'api/**/*.ts';
export const CONNECT_EXPRESS_ENTRY = 'server.ts';

export function vercelHasExpressServerlessEntry(): boolean {
  return false;
}

export function vercelRewritesToServer(): boolean {
  return false;
}

export function vercelOutputIsStaticDist(): boolean {
  return true;
}

export function functionsGlobMatchesExpressEntry(
  glob: string,
  entry: string
): boolean {
  return glob === 'api/**/*.ts' && entry.startsWith('api/');
}
