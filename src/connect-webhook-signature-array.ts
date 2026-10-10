/**
 * Mirrors Connect webhook signature handling in stripe-connect-sample/server.ts.
 *
 * Both /webhook and /webhook/thin read:
 *   const sig = req.headers['stripe-signature'] as string;
 * Node/Express turns a duplicate header into string[]. constructEvent
 * and parseThinEvent expect a string; an array throws before the
 * verify catch can classify it as a signature failure, or is coerced
 * via ToString to "sig1,sig2" which never matches.
 *
 * Open PRs #3/#15/#39 lock empty WEBHOOK_SECRET, missing tolerance,
 * and body-parser order. They do not lock a multi-value signature
 * header.
 */

export function stripeSignatureFromHeader(
  header: string | string[] | undefined
): string {
  return header as string;
}

export function isUsableStripeSignature(sig: unknown): sig is string {
  return typeof sig === 'string' && sig.length > 0;
}

export function productionCastsSignatureHeaderToString(source: string): boolean {
  const webhookCasts =
    source.includes("req.headers['stripe-signature'] as string") ||
    source.includes('req.headers["stripe-signature"] as string');
  const guardsArray =
    source.includes('Array.isArray(sig)') ||
    source.includes("Array.isArray(req.headers['stripe-signature'])") ||
    source.includes('Array.isArray(req.headers["stripe-signature"])');
  return webhookCasts && !guardsArray;
}
