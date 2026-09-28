/**
 * Mirrors stripe-connect-sample/server.ts webhook signing.
 *
 * Open PR #15 locks an empty WEBHOOK_SECRET being forwarded to Stripe
 * and the thin-event retrieve sitting outside verify. It does not lock
 * that `/webhook` (v1) and `/webhook/thin` (v2) share one env var.
 *
 * Stripe issues a distinct signing secret per Dashboard endpoint. The
 * sample documents two URLs (`/webhook` and `/webhook/thin`) but both
 * call constructEvent / parseThinEvent with `WEBHOOK_SECRET || ''`.
 * Configuring both endpoints with the documented secrets means one
 * path's signatures will never verify.
 */

export const CONNECT_WEBHOOK_SECRET_ENV = 'WEBHOOK_SECRET';

export const CONNECT_WEBHOOK_PATHS = ['/webhook', '/webhook/thin'] as const;

export function resolveWebhookSigningSecret(secret: string | undefined): string {
  return secret || '';
}

export function connectThinWebhookSecretEnv(): string {
  return CONNECT_WEBHOOK_SECRET_ENV;
}

export function connectWebhookEndpointsShareOneSecret(): boolean {
  return connectThinWebhookSecretEnv() === CONNECT_WEBHOOK_SECRET_ENV;
}
