import type { TestResult, RuleInput } from '../types.js';

export type XRobotsTagResult = TestResult<
  { headerValue: string | null; directives: string[] },
  { noindex: false }
>;

/**
 * Detects noindex/nosnippet/unavailable_after directives in the X-Robots-Tag HTTP header.
 *
 * Unlike the noindex HTML rule (meta tag), this rule specifically targets the
 * HTTP response header — useful for catching server-level blocks that might
 * exist independently of HTML content (e.g., on PDFs, API responses, or via
 * CDN/proxy configuration).
 *
 * Pass: X-Robots-Tag header absent, or present without blocking directives
 * Fail: X-Robots-Tag contains noindex
 * Warn: X-Robots-Tag contains nosnippet or unavailable_after
 */
export function checkXRobotsTag(input: RuleInput): XRobotsTagResult {
  const start = Date.now();

  if (!input.responseHeaders) {
    return {
      ruleId: 'x-robots-tag',
      status: 'pass',
      severity: 'warning',
      actual: { headerValue: null, directives: [] },
      expected: { noindex: false },
      message: 'X-Robots-Tag header not present (or not provided to rule). Page is indexable.',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag#xrobotstag',
    };
  }

  // Header names are case-insensitive; check both common casings
  const headerValue =
    input.responseHeaders['x-robots-tag'] ??
    input.responseHeaders['X-Robots-Tag'] ??
    null;

  if (!headerValue) {
    return {
      ruleId: 'x-robots-tag',
      status: 'pass',
      severity: 'warning',
      actual: { headerValue: null, directives: [] },
      expected: { noindex: false },
      message: 'X-Robots-Tag header not present. Page is indexable.',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag#xrobotstag',
    };
  }

  // Parse comma-separated directives (case-insensitive)
  const directives = headerValue
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (directives.includes('noindex')) {
    return {
      ruleId: 'x-robots-tag',
      status: 'fail',
      severity: 'warning',
      actual: { headerValue, directives },
      expected: { noindex: false },
      message: `X-Robots-Tag: "${headerValue}" contains noindex — this page will not be indexed by search engines.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag#xrobotstag',
    };
  }

  const advisoryDirectives = ['nosnippet', 'unavailable_after', 'noimageindex', 'none'];
  const foundAdvisory = directives.filter((d) =>
    advisoryDirectives.some((a) => d.startsWith(a))
  );

  if (foundAdvisory.length > 0) {
    return {
      ruleId: 'x-robots-tag',
      status: 'warn',
      severity: 'warning',
      actual: { headerValue, directives },
      expected: { noindex: false },
      message: `X-Robots-Tag: "${headerValue}" contains advisory directive(s): ${foundAdvisory.join(', ')}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag#xrobotstag',
    };
  }

  return {
    ruleId: 'x-robots-tag',
    status: 'pass',
    severity: 'warning',
    actual: { headerValue, directives },
    expected: { noindex: false },
    message: `X-Robots-Tag: "${headerValue}" — no blocking directives found.`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/robots_meta_tag#xrobotstag',
  };
}
