/**
 * The Connect dashboard injects the Stripe onboarding URL as
 *   <a href="${linkResult.url}" target="_blank" ...>
 * with no rel="noopener noreferrer". target=_blank without noopener
 * leaves window.opener set, so the opened page can navigate the
 * dashboard (tabnabbing) or read it after a compromised/attacker-
 * controlled onboarding URL. Combined with missing COOP (# this PR)
 * and raw href interpolation (open PR #23).
 *
 * Open coverage PRs #22/#23 lock onboarding copy and href XSS. They
 * do not lock rel=noopener on target=_blank.
 */

const TARGET_BLANK_ANCHOR =
  /<a\b[^>]*\btarget\s*=\s*["']_blank["'][^>]*>/gi;

export function targetBlankOpenTags(html: string): string[] {
  const tags: string[] = [];
  const matches = html.matchAll(TARGET_BLANK_ANCHOR);
  for (const match of matches) {
    const tag = match[0];
    if (typeof tag === 'string') {
      tags.push(tag);
    }
  }
  return tags;
}

export function targetBlankLinksHaveNoopener(html: string): boolean {
  const tags = targetBlankOpenTags(html);
  if (tags.length === 0) {
    return false;
  }
  return tags.every(
    (tag) =>
      /\brel\s*=\s*["'][^"']*noopener/i.test(tag) ||
      /\brel\s*=\s*["'][^"']*noreferrer/i.test(tag)
  );
}

export function sourceInterpolatesOnboardingHref(html: string): boolean {
  return (
    html.includes('linkResult.url') &&
    /href="\$\{linkResult\.url\}"/.test(html) &&
    /target="_blank"/.test(html)
  );
}

export function productionSetsOnboardingNoopener(): boolean {
  return false;
}
