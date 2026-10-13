import dotenv from 'dotenv';

/**
 * Load repo-root `.env` into `process.env`.
 *
 * README and `.env.example` tell operators to put `STRIPE_API_KEY` and
 * `MCP_API_KEY` in a `.env` file. Node does not read that file unless we
 * call dotenv. Without this, `npm start` / `npm run start:web` ignore the
 * documented config: Stripe calls go out with an empty key, and Bearer
 * auth stays off even when `MCP_API_KEY` is set in `.env`.
 *
 * Existing environment variables win (dotenv default), so platform-injected
 * secrets are not overwritten.
 */
export function loadEnv(): dotenv.DotenvConfigOutput {
  return dotenv.config();
}
