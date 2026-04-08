import * as cheerio from 'cheerio';
import type { CanonicalResult, RuleInput } from '../types.js';

export type CanonicalRuleOptions = {
  /** Expected canonical URL. If provided, the rule checks this value matches. */
  expectedUrl?: string;
};

/**
 * Validates the presence of a canonical link element.
 *
 * Pass: <link rel="canonical" href="..."> exists with a non-empty href
 * Fail: canonical link missing, href empty, or (if expectedUrl given) value mismatch
 */
export function checkCanonical(
  input: RuleInput,
  options: CanonicalRuleOptions = {}
): CanonicalResult {
  const start = Date.now();
  const selector = 'link[rel="canonical"]';

  const $ = cheerio.load(input.html);
  const canonicalEl = $(selector);

  if (canonicalEl.length === 0) {
    return {
      ruleId: 'canonical',
      status: 'fail',
      severity: 'error',
      actual: null,
      expected: { self: options.expectedUrl ?? input.url },
      selector,
      message: `<link rel="canonical"> is missing. Without it, search engines may index duplicate or unintended URLs.\nFix: Add <link rel="canonical" href="${options.expectedUrl ?? input.url}"> in <head>.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
    };
  }

  const href = canonicalEl.attr('href');

  if (!href || !href.trim()) {
    return {
      ruleId: 'canonical',
      status: 'fail',
      severity: 'error',
      actual: href ?? null,
      expected: { self: options.expectedUrl ?? input.url },
      selector,
      message: `<link rel="canonical"> exists but href is empty. An empty canonical is ignored by search engines.\nFix: Set href to the full absolute URL of this page (e.g., href="${options.expectedUrl ?? input.url}").`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
    };
  }

  const trimmedHref = href.trim();

  if (options.expectedUrl && trimmedHref !== options.expectedUrl) {
    return {
      ruleId: 'canonical',
      status: 'fail',
      severity: 'error',
      actual: trimmedHref,
      expected: { self: options.expectedUrl },
      selector,
      message: `<link rel="canonical"> href mismatch.\n  Actual:   "${trimmedHref}"\n  Expected: "${options.expectedUrl}"\nFix: Update the canonical href to match the expected URL, or adjust the expectedUrl in your seo.config.ts.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
    };
  }

  return {
    ruleId: 'canonical',
    status: 'pass',
    severity: 'error',
    actual: trimmedHref,
    expected: { self: options.expectedUrl ?? trimmedHref },
    selector,
    message: `<link rel="canonical" href="${trimmedHref}"> is present.`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
  };
}
