/**
 * Mirrors public/app.js checkout() HTTP handling.
 *
 * Open PR #14 locks a 200 {sessionId} missing /success and a missing
 * sessionId leaving the button stuck. It does not lock that checkout()
 * never reads response.ok — a 5xx {error} is parsed the same as success
 * and, with no sessionId, never resets the Checkout button.
 */

export type CheckoutButtonState = {
  disabled: boolean;
  label: string;
};

export function catalogCheckoutChecksResponseOk(): boolean {
  return false;
}

export function checkoutButtonAfterResponse(args: {
  responseOk: boolean;
  sessionId?: string;
  threw?: boolean;
}): CheckoutButtonState {
  if (args.threw) {
    return { disabled: false, label: 'Checkout' };
  }
  if (args.sessionId) {
    return { disabled: true, label: 'Processing...' };
  }
  return { disabled: true, label: 'Processing...' };
}
