/**
 * Mirrors Connect webhook ack behavior in stripe-connect-sample/server.ts.
 *
 * Open PRs #19/#22/#23/#24/#25/#31 lock missing event types, sparse
 * subscription.updated crashes, and unused event.account. They do not lock
 * replay: constructEvent uses the default 300s tolerance, event.id is never
 * recorded, and livemode is never checked before fulfillment TODOs run.
 */

export const STRIPE_DEFAULT_TOLERANCE_SECONDS = 300;

export type StripeLikeEvent = {
  id: string;
  type: string;
  livemode: boolean;
};

export function productionRecordsEventId(): boolean {
  return false;
}

export function productionChecksLivemode(): boolean {
  return false;
}

export function productionPassesToleranceToConstructEvent(): boolean {
  return false;
}

export function shouldReplay(
  eventId: string,
  seenIds: ReadonlySet<string>
): boolean {
  return seenIds.has(eventId);
}

export function livemodeMatches(
  event: StripeLikeEvent,
  expectedLivemode: boolean
): boolean {
  return event.livemode === expectedLivemode;
}

export function productionAcknowledgesAfterSwitch(_event: StripeLikeEvent): boolean {
  return true;
}
