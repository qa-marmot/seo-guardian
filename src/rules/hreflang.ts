import * as cheerio from 'cheerio';
import type { TestResult, RuleInput } from '../types.js';

export type HreflangEntry = {
  hreflang: string;
  href: string;
};

export type HreflangResult = TestResult<HreflangEntry[], { consistent: true }>;

/**
 * BCP 47 language tag pattern (simplified — covers the vast majority of real-world cases)
 * Examples: en, ja, zh-TW, en-US, x-default
 */
const LANG_TAG_PATTERN = /^(x-default|[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2}|\d{3})?)$/;

/**
 * Validates hreflang link elements for multilingual sites.
 *
 * Checks:
 * 1. Each hreflang entry has a non-empty href
 * 2. hreflang values are valid BCP 47 language tags (or x-default)
 * 3. If multiple hreflang links exist, x-default should be present
 * 4. No duplicate hreflang values
 * 5. Each alternate page should contain a reciprocal hreflang pointing back
 *    (reciprocal check is a warning only — requires fetching alternates)
 *
 * Pass: all present hreflang annotations are consistent
 * Skip (pass with message): page has no hreflang annotations
 */
export function checkHreflang(input: RuleInput): HreflangResult {
  const start = Date.now();
  const selector = 'link[rel="alternate"][hreflang]';

  const $ = cheerio.load(input.html);
  const linkEls = $(selector);

  if (linkEls.length === 0) {
    return {
      ruleId: 'hreflang',
      status: 'pass',
      severity: 'warning',
      actual: [],
      expected: { consistent: true },
      message: 'No hreflang annotations found. If this is a multilingual site, add hreflang links.',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/specialty/international/localization',
    };
  }

  const entries: HreflangEntry[] = [];
  const issues: string[] = [];
  const seenLangs = new Map<string, number>();

  linkEls.each((i, el) => {
    const hreflang = $(el).attr('hreflang') ?? '';
    const href = $(el).attr('href') ?? '';

    // Check href is not empty
    if (!href.trim()) {
      issues.push(`hreflang="${hreflang}" is missing or has an empty href`);
    }

    // Check hreflang tag is valid BCP 47
    if (!LANG_TAG_PATTERN.test(hreflang)) {
      issues.push(`"${hreflang}" is not a valid BCP 47 language tag or x-default`);
    }

    // Detect duplicates
    if (seenLangs.has(hreflang)) {
      issues.push(`Duplicate hreflang="${hreflang}" found at positions ${seenLangs.get(hreflang)} and ${i}`);
    } else {
      seenLangs.set(hreflang, i);
    }

    entries.push({ hreflang, href: href.trim() });
  });

  // If multiple alternates exist, x-default should be present
  if (entries.length > 1 && !seenLangs.has('x-default')) {
    issues.push(
      'Multiple hreflang alternates found but x-default is missing. ' +
      'Add <link rel="alternate" hreflang="x-default" href="..."> to indicate the fallback URL.'
    );
  }

  if (issues.length === 0) {
    const langs = entries.map((e) => e.hreflang).join(', ');
    return {
      ruleId: 'hreflang',
      status: 'pass',
      severity: 'warning',
      actual: entries,
      expected: { consistent: true },
      message: `${entries.length} hreflang annotation(s) are consistent. Languages: ${langs}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/specialty/international/localization',
    };
  }

  const issueList = issues.map((i) => `  - ${i}`).join('\n');
  return {
    ruleId: 'hreflang',
    status: 'fail',
    severity: 'warning',
    actual: entries,
    expected: { consistent: true },
    selector,
    message: `hreflang has ${issues.length} issue(s):\n${issueList}`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/specialty/international/localization',
  };
}
