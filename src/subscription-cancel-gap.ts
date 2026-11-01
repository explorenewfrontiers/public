/**
 * MCP exposes payment-intent / customer / invoice tools but no
 * `cancel_subscription` (or list/update subscription) tool, and
 * Connect never calls `subscriptions.cancel`.
 *
 * Recurring billing can be created (`POST /api/subscriptions`
 * Checkout `mode: 'subscription'`) but cannot be stopped from
 * this codebase. Billing portal exists as a customer self-serve
 * path, but it omits `configuration` (#38) so first-time portal
 * often fails — leaving no working cancel path at all.
 *
 * Distinct from `/webhook` handling `customer.subscription.deleted`
 * (#7 / #23) — that is inbound after Stripe already canceled.
 * Distinct from logging `cancel_at_period_end` on
 * `subscription.updated` — the app never *sets* that flag.
 * Distinct from `refunds.create` (#69) — refunding a charge does
 * not stop the next invoice.
 *
 * Dashboard API docs list `POST /api/subscriptions` (create) and
 * the billing portal, but no cancel endpoint.
 *
 * Open coverage PRs lock inbound subscription *deleted* and
 * created/access (#23), refund *tools* (#69), and portal
 * `configuration` / `flow_data` (#38 / #68). They do not lock
 * an outbound cancel API.
 */

export interface SubscriptionCancelFields {
  hasCancelSubscriptionTool: boolean;
  hasListSubscriptionsTool: boolean;
  hasUpdateSubscriptionTool: boolean;
  callsSubscriptionsCancel: boolean;
  handlesCancelSubscriptionTool: boolean;
}

export function sourceDefinesTool(source: string, toolName: string): boolean {
  const escaped = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`['"]${escaped}['"]\\s*:`).test(source);
}

export function sourceCallsSubscriptionsCancel(source: string): boolean {
  return /subscriptions\.cancel\s*\(/.test(source);
}

export function sourceHandlesCancelSubscriptionTool(source: string): boolean {
  return /case\s+['"]cancel_subscription['"]/.test(source);
}

export function sourceSetsCancelAtPeriodEnd(source: string): boolean {
  return /cancel_at_period_end\s*:/.test(source);
}

export function inspectSubscriptionCancelGap(
  source: string
): SubscriptionCancelFields {
  return {
    hasCancelSubscriptionTool: sourceDefinesTool(source, 'cancel_subscription'),
    hasListSubscriptionsTool: sourceDefinesTool(source, 'list_subscriptions'),
    hasUpdateSubscriptionTool: sourceDefinesTool(source, 'update_subscription'),
    callsSubscriptionsCancel: sourceCallsSubscriptionsCancel(source),
    handlesCancelSubscriptionTool: sourceHandlesCancelSubscriptionTool(source),
  };
}

export function recurringBillingCannotBeStopped(
  hasCancelSubscriptionTool: boolean,
  callsSubscriptionsCancel: boolean
): boolean {
  return !hasCancelSubscriptionTool && !callsSubscriptionsCancel;
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

export function dashboardDocumentsCancelEndpoint(html: string): boolean {
  return /POST\s+\/api\/subscriptions\/.+cancel|subscriptions\.cancel/i.test(
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
