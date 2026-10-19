/**
 * Catalog `POST /api/checkout`, Connect `POST /api/checkout` /
 * `POST /api/subscriptions`, and MCP `create_payment_intent` never set
 * a bank-statement descriptor, never collect a phone number, and never
 * enable promotion codes.
 *
 * Stripe Checkout defaults the card statement to the account display
 * name (or a generic Stripe descriptor). Without
 * `payment_intent_data.statement_descriptor` /
 * `statement_descriptor_suffix` (Checkout) or `statement_descriptor`
 * (PaymentIntent / Product), cardholders cannot recognize the charge
 * and dispute rates climb. `phone_number_collection` stays off, so
 * there is no buyer phone for fraud review or shipping contact — this
 * is distinct from billing_address (#59) and shipping_address (#61).
 * `allow_promotion_codes` stays unset, so coupons created in the
 * Dashboard cannot be applied at hosted Checkout.
 *
 * Open coverage PRs lock customer/invoice/consent/shipping (#61) and
 * tax/address/expiry (#59). They do not lock these buyer-facing
 * statement, contact, and promo fields.
 */

export interface CheckoutBuyerFacingFields {
  hasStatementDescriptor: boolean;
  hasStatementDescriptorSuffix: boolean;
  hasPhoneNumberCollection: boolean;
  hasAllowPromotionCodes: boolean;
}

export function sourceSetsStatementDescriptor(source: string): boolean {
  return /statement_descriptor\s*:/.test(source);
}

export function sourceSetsStatementDescriptorSuffix(source: string): boolean {
  return /statement_descriptor_suffix\s*:/.test(source);
}

export function sourceSetsPhoneNumberCollection(source: string): boolean {
  return /phone_number_collection\s*:/.test(source);
}

export function sourceEnablesAllowPromotionCodes(source: string): boolean {
  return /allow_promotion_codes\s*:/.test(source);
}

export function inspectCheckoutBuyerFacingFields(
  source: string
): CheckoutBuyerFacingFields {
  return {
    hasStatementDescriptor: sourceSetsStatementDescriptor(source),
    hasStatementDescriptorSuffix: sourceSetsStatementDescriptorSuffix(source),
    hasPhoneNumberCollection: sourceSetsPhoneNumberCollection(source),
    hasAllowPromotionCodes: sourceEnablesAllowPromotionCodes(source),
  };
}

export function bankStatementIsGeneric(args: {
  hasStatementDescriptor: boolean;
  hasStatementDescriptorSuffix: boolean;
}): boolean {
  return !args.hasStatementDescriptor && !args.hasStatementDescriptorSuffix;
}

export function checkoutCollectsNoPhone(hasPhoneNumberCollection: boolean): boolean {
  return !hasPhoneNumberCollection;
}

export function checkoutRejectsDashboardCoupons(hasAllowPromotionCodes: boolean): boolean {
  return !hasAllowPromotionCodes;
}

export function sourceEnablesPhoneNumberCollection(source: string): boolean {
  return /phone_number_collection\s*:\s*\{[\s\S]{0,120}enabled\s*:\s*true/.test(source);
}

export function sourceEnablesPromotionCodesTrue(source: string): boolean {
  return /allow_promotion_codes\s*:\s*true/.test(source);
}

export function extractCheckoutAndPaymentIntentCreates(source: string): string {
  const chunks: string[] = [];
  const re = /(?:checkout\.sessions\.create|paymentIntents\.create|default_price_data)\s*[:=({]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 900));
  }
  return chunks.join('\n---\n');
}

export function extractProductCreates(source: string): string {
  const chunks: string[] = [];
  const re = /products\.create\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    chunks.push(source.slice(match.index, match.index + 500));
  }
  return chunks.join('\n---\n');
}
