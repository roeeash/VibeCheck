import type { ThirdPartyCategory } from '../types.js';

const ANALYTICS_DOMAINS = ['google-analytics.com', 'googletagmanager.com', 'segment.com', 'heap.io', 'mixpanel.com', 'amplitude.com'];
const ADS_DOMAINS = ['doubleclick.net', 'adsense.google.com', 'ads.google.com', 'adservice.google.com'];
const AB_TESTING_DOMAINS = ['optimizely.com', 'launchdarkly.com', 'split.io'];
const CDN_DOMAINS = ['cloudflare.com', 'cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com'];
const TAG_MANAGER_DOMAINS = ['googletagmanager.com', 'tagmanager.google.com'];

/**
 * Classifies a script URL as first-party or third-party category.
 */
export function classifyOrigin(scriptUrl: string, auditUrl: string): ThirdPartyCategory | 'first_party' {
  try {
    const scriptHostname = new URL(scriptUrl).hostname;
    const auditHostname = new URL(auditUrl).hostname;

    if (scriptHostname === auditHostname) {
      return 'first_party';
    }

    // Check against known categories
    if (TAG_MANAGER_DOMAINS.some((d) => scriptHostname.includes(d))) {
      return 'tag_manager';
    }
    if (ANALYTICS_DOMAINS.some((d) => scriptHostname.includes(d))) {
      return 'analytics';
    }
    if (ADS_DOMAINS.some((d) => scriptHostname.includes(d))) {
      return 'ads';
    }
    if (AB_TESTING_DOMAINS.some((d) => scriptHostname.includes(d))) {
      return 'ab_testing';
    }
    if (CDN_DOMAINS.some((d) => scriptHostname.includes(d))) {
      return 'cdn';
    }

    return 'other_third_party';
  } catch {
    // Invalid URL, assume third-party
    return 'other_third_party';
  }
}
