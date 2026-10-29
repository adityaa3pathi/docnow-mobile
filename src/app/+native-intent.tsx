import { deepLinkPath, parseDeepLink } from '@/lib/deep-links';

/**
 * Rewrites public `docnow://` links (push payloads, SMS, WhatsApp) to in-app routes before the
 * router sees them. Anything outside the contract passes through untouched.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const target = parseDeepLink(path);
    return target ? deepLinkPath(target) : path;
  } catch {
    return path;
  }
}
