import * as cheerio from 'cheerio';
import type { H1Result, RuleInput } from '../types.js';

/**
 * Validates that exactly one <h1> element exists on the page.
 *
 * Pass: exactly 1 h1 element
 * Fail: 0 h1 elements (missing) or 2+ h1 elements (duplicates)
 */
export function checkH1Single(input: RuleInput): H1Result {
  const start = Date.now();

  const $ = cheerio.load(input.html);
  const h1Elements = $('h1');
  const count = h1Elements.length;
  const texts = h1Elements
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  if (count === 0) {
    return {
      ruleId: 'h1-single',
      status: 'fail',
      severity: 'error',
      actual: [],
      expected: { count: 1 },
      selector: 'h1',
      message: 'No <h1> element found. Each page should have exactly one <h1>.',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    };
  }

  if (count > 1) {
    return {
      ruleId: 'h1-single',
      status: 'fail',
      severity: 'error',
      actual: texts,
      expected: { count: 1 },
      selector: 'h1',
      message: `Found ${count} <h1> elements, but exactly 1 is required. Values: ${texts.map((t) => `"${t}"`).join(', ')}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    };
  }

  return {
    ruleId: 'h1-single',
    status: 'pass',
    severity: 'error',
    actual: texts,
    expected: { count: 1 },
    selector: 'h1',
    message: `Found exactly 1 <h1>: "${texts[0] ?? ''}"`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  };
}
