/**
 * MCP exposes `create_payment_intent` / `list_charges` / `get_charge`
 * but no refund tools, and Connect never calls `refunds.create`.
 * A mistaken charge cannot be reversed through this codebase.
 * Distinct from `/webhook` ignoring `charge.refunded` (#23) — that
 * is inbound; this is the missing outbound refund API.
 *
 * Connect `/webhook` also ignores `payout.paid`, `payout.failed`,
 * and `payout.canceled`. Connected accounts never learn that Stripe
 * deposited funds or that a payout bounced, so operators keep
 * creating Checkout sessions against accounts that cannot receive
 * money. Distinct from account status `payouts_enabled` on GET
 * (#42) and thin merchant capability events (#31).
 *
 * Open coverage PRs lock refund *events* (#23) and payout *status
 * fields* (#42). They do not lock refund *tools* or payout *events*.
 */

export interface McpRefundToolFields {
  hasCreateRefundTool: boolean;
  hasGetRefundTool: boolean;
  hasListRefundsTool: boolean;
  callsRefundsCreate: boolean;
}

export interface PayoutWebhookCases {
  handlesPayoutPaid: boolean;
  handlesPayoutFailed: boolean;
  handlesPayoutCanceled: boolean;
}

export function sourceDefinesTool(source: string, toolName: string): boolean {
  const escaped = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`['"]${escaped}['"]\\s*:`).test(source);
}

export function sourceCallsRefundsCreate(source: string): boolean {
  return /refunds\.create\s*\(/.test(source);
}

export function sourceHandlesRefundTool(source: string): boolean {
  return /case\s+['"]create_refund['"]/.test(source);
}

export function inspectMcpRefundTools(source: string): McpRefundToolFields {
  return {
    hasCreateRefundTool: sourceDefinesTool(source, 'create_refund'),
    hasGetRefundTool: sourceDefinesTool(source, 'get_refund'),
    hasListRefundsTool: sourceDefinesTool(source, 'list_refunds'),
    callsRefundsCreate: sourceCallsRefundsCreate(source),
  };
}

export function mistakenChargesCannotBeReversed(
  hasCreateRefundTool: boolean,
  callsRefundsCreate: boolean
): boolean {
  return !hasCreateRefundTool && !callsRefundsCreate;
}

export function extractClassicWebhookHandler(source: string): string {
  const start = source.indexOf("'/webhook'");
  const thin = source.indexOf("'/webhook/thin'");
  if (start === -1) {
    return '';
  }
  const end = thin === -1 ? source.length : thin;
  return source.slice(start, end);
}

export function webhookHandlesEventType(
  webhookSource: string,
  eventType: string
): boolean {
  const escaped = eventType.replace(/\./g, '\\.');
  return new RegExp(`case\\s+['"]${escaped}['"]`).test(webhookSource);
}

export function inspectPayoutWebhookCases(
  webhookSource: string
): PayoutWebhookCases {
  return {
    handlesPayoutPaid: webhookHandlesEventType(webhookSource, 'payout.paid'),
    handlesPayoutFailed: webhookHandlesEventType(webhookSource, 'payout.failed'),
    handlesPayoutCanceled: webhookHandlesEventType(
      webhookSource,
      'payout.canceled'
    ),
  };
}

export function sellersNeverLearnPayoutOutcome(
  handlesPaid: boolean,
  handlesFailed: boolean
): boolean {
  return !handlesPaid && !handlesFailed;
}

export function dashboardDocumentsWebhookEvent(
  dashboardSource: string,
  eventType: string
): boolean {
  return dashboardSource.includes(eventType);
}

export function extractDashboardWebhookDocs(html: string): string {
  const heading = html.indexOf('Webhook Setup');
  if (heading === -1) {
    return '';
  }
  return html.slice(heading, heading + 1800);
}

export function extractMcpToolRecord(source: string): string {
  const start = source.indexOf('const tools:');
  const end = source.indexOf('async function handleToolCall');
  if (start === -1) {
    return '';
  }
  return source.slice(start, end === -1 ? source.length : end);
}
