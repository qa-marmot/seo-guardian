import * as cheerio from 'cheerio';
import type { NoindexResult, RuleInput } from '../types.js';

/**
 * Detects noindex directives on the page.
 *
 * Checks:
 * 1. <meta name="robots" content="noindex,...">
 * 2. <meta name="googlebot" content="noindex,...">
 * 3. X-Robots-Tag: noindex response header (if responseHeaders provided)
 *
 * Pass: no noindex directive found
 * Fail: noindex directive found (blocks indexing in production)
 */
export function checkNoindex(input: RuleInput): NoindexResult {
  const start = Date.now();

  const $ = cheerio.load(input.html);

  // Check meta robots / googlebot tags
  const noindexSelectors = [
    'meta[name="robots"]',
    'meta[name="googlebot"]',
    'meta[name="Robots"]',
    'meta[name="ROBOTS"]',
  ] as const;

  for (const selector of noindexSelectors) {
    const metaEl = $(selector);
    const content = metaEl.attr('content') ?? '';
    if (hasNoindex(content)) {
      return {
        ruleId: 'noindex',
        status: 'fail',
        severity: 'error',
        actual: true,
        expected: { noindex: false },
        selector,
        message: `Found noindex directive in ${selector} content="${content}".\nThis will prevent search engines from indexing this page in production.\nFix: Remove "noindex" from the content attribute, or add this path to the noindex: 'off' rule in seo.config.ts if noindex is intentional.`,
        context: input.context,
        url: input.url,
        duration: Date.now() - start,
        helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
      };
    }
  }

  // Check X-Robots-Tag response header
  if (input.responseHeaders) {
    const xRobotsTag =
      input.responseHeaders['x-robots-tag'] ??
      input.responseHeaders['X-Robots-Tag'] ??
      '';

    if (hasNoindex(xRobotsTag)) {
      return {
        ruleId: 'noindex',
        status: 'fail',
        severity: 'error',
        actual: true,
        expected: { noindex: false },
        message: `Found noindex directive in X-Robots-Tag response header: "${xRobotsTag}".\nThis server-level directive will prevent search engines from indexing this page.\nFix: Remove or change the X-Robots-Tag header in your server/CDN configuration, or use the x-robots-tag rule override if intentional.`,
        context: input.context,
        url: input.url,
        duration: Date.now() - start,
        helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
      };
    }
  }

  return {
    ruleId: 'noindex',
    status: 'pass',
    severity: 'error',
    actual: false,
    expected: { noindex: false },
    message: 'No noindex directive found. Page is indexable.',
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/block-indexing',
  };
}

/** Returns true if the robots directive string contains a noindex token. */
function hasNoindex(value: string): boolean {
  // Split by comma, trim each token, check for 'noindex' (case-insensitive)
  return value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .includes('noindex');
}
