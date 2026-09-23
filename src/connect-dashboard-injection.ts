/**
 * Mirrors stripe-connect-sample/public/index.html and storefront.html
 * interpolation that previous coverage PRs do not lock down.
 *
 * After onboarding status, the dashboard writes `linkResult.url` into an
 * anchor href and each requirement name into `<li>${req}</li>` with no
 * escaping. A javascript: onboarding URL or a requirement string with
 * markup becomes executable HTML.
 *
 * Opening the storefront concatenates `accountId` into the query string
 * without encodeURIComponent, so an id containing `&` or `#` injects extra
 * query parameters. storefront.html does encode the fetch URL, but
 * handlePurchase still posts the raw accountId.
 */

export function renderOnboardingLink(url: string): string {
  return `<p><a href="${url}" target="_blank" style="display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: 600;">Complete Onboarding</a></p>`;
}

export function renderRequirementItem(requirement: string): string {
  return `<li>${requirement}</li>`;
}

export function buildStorefrontNavigationUrl(accountId: string): string {
  return `/storefront.html?accountId=${accountId}`;
}

export function buildStorefrontProductsFetchUrl(accountId: string): string {
  return `/api/products/${encodeURIComponent(accountId)}`;
}

export function onboardingUrlIsSafeHref(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
