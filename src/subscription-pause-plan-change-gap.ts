/**
 * MCP and Connect can create recurring billing but cannot pause
 * it or change the plan from this codebase.
 *
 * Connect `POST /api/subscriptions` creates Checkout
 * `mode: 'subscription'` and never calls `subscriptions.update`.
 * There is no `pause_collection`, no `items` (plan/quantity
 * change), and no `trial_end` write. MCP has no
 * `pause_subscription` tool and never calls
 * `subscriptions.update`.
 *
 * Distinct from `subscriptions.cancel` / `cancel_subscription`
 * (#73) — cancel *stops* billing; pause keeps the subscription
 * (and typically the period) while collection is halted. A
 * merchant who needs to freeze a delinquent account, or a
 * customer who upgrades `price_basic` → `price_pro`, has no
 * API here.
 *
 * Distinct from inbound `customer.subscription.updated` (#7)
 * and ignored `customer.subscription.paused` / `resumed` (#25)
 * — those are webhooks *after* Stripe already changed the
 * subscription. Distinct from Checkout-create
 * `proration_behavior` / `billing_cycle_anchor` (#67) — those
 * are create-time fields, not an update.
 *
 * Dashboard API docs list create + portal only. Portal
 * `flow_data` is omitted (#68), so there is no
 * `subscription_update` deep-link either.
 *
 * Open coverage PRs lock cancel (#73), inbound paused/resumed
 * (#25), and create-time proration (#67). They do not lock an
 * outbound pause or plan-change API.
 */

export interface SubscriptionPausePlanChangeFields {
  hasPauseSubscriptionTool: boolean;
  callsSubscriptionsUpdate: boolean;
  handlesPauseSubscriptionTool: boolean;
  setsPauseCollection: boolean;
}

export function sourceDefinesTool(source: string, toolName: string): boolean {
  const escaped = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`['"]${escaped}['"]\\s*:`).test(source);
}

export function sourceCallsSubscriptionsUpdate(source: string): boolean {
  return /subscriptions\.update\s*\(/.test(source);
}

export function sourceHandlesPauseSubscriptionTool(source: string): boolean {
  return /case\s+['"]pause_subscription['"]/.test(source);
}

export function sourceSetsPauseCollection(source: string): boolean {
  return /pause_collection\s*:/.test(source);
}

export function sourceSetsSubscriptionUpdateItems(source: string): boolean {
  return /subscriptions\.update\s*\([\s\S]{0,800}items\s*:/.test(source);
}

export function inspectSubscriptionPausePlanChangeGap(
  source: string
): SubscriptionPausePlanChangeFields {
  return {
    hasPauseSubscriptionTool: sourceDefinesTool(source, 'pause_subscription'),
    callsSubscriptionsUpdate: sourceCallsSubscriptionsUpdate(source),
    handlesPauseSubscriptionTool: sourceHandlesPauseSubscriptionTool(source),
    setsPauseCollection: sourceSetsPauseCollection(source),
  };
}

export function recurringBillingCannotBePausedOrChanged(
  hasPauseSubscriptionTool: boolean,
  callsSubscriptionsUpdate: boolean
): boolean {
  return !hasPauseSubscriptionTool && !callsSubscriptionsUpdate;
}

export function extractMcpToolRecord(source: string): string {
  const start = source.indexOf('const tools:');
  const end = source.indexOf('async function handleToolCall');
  if (start === -1) {
    return '';
  }
  return source.slice(start, end === -1 ? source.length : end);
}

export function extractConnectSubscriptionRoute(source: string): string {
  const start = source.indexOf("app.post('/api/subscriptions'");
  if (start === -1) {
    return '';
  }
  const next = source.indexOf('app.post(', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

export function dashboardDocumentsPauseOrPlanChangeEndpoint(html: string): boolean {
  return /POST\s+\/api\/subscriptions\/.+(pause|update)|subscriptions\.update|pause_collection/i.test(
    html
  );
}

export function extractDashboardApiDocs(html: string): string {
  const heading = html.indexOf('API Endpoints');
  if (heading === -1) {
    const fallback = html.indexOf('POST /api/subscriptions');
    return fallback === -1 ? '' : html.slice(fallback - 80, fallback + 600);
  }
  return html.slice(heading, heading + 1200);
}
