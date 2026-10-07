/**
 * Mirrors Connect webhook signature verification in
 * stripe-connect-sample/server.ts.
 *
 * Open PR #39 locks replay (event.id, livemode, 300s default
 * tolerance). It does not lock that constructEvent / parseThinEvent
 * are called with only (body, sig, secret) — no apiVersion — so a
 * webhook endpoint configured on a different Stripe API version than
 * stripe@15's SDK default can verify the signature and still decode
 * the object with the wrong shape.
 */

export function productionPassesApiVersionToConstructEvent(): boolean {
  return false;
}

export function productionPassesApiVersionToParseThinEvent(): boolean {
  return false;
}

export function constructEventCallUsesApiVersionOption(
  source: string
): boolean {
  return /constructEvent\([\s\S]*apiVersion/.test(source);
}

export function parseThinEventCallUsesApiVersionOption(
  source: string
): boolean {
  return /parseThinEvent\([\s\S]*apiVersion/.test(source);
}
