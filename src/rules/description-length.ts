import * as cheerio from 'cheerio';
import type { DescriptionResult, RuleInput } from '../types.js';

export type DescriptionLengthRuleOptions = {
  min?: number;
  max?: number;
};

const DEFAULTS = {
  min: 70,
  max: 160,
} as const;

/**
 * Validates the <meta name="description"> existence and character length.
 *
 * Pass: description exists and length is within [min, max]
 * Fail: description missing/empty, or length out of range
 *
 * Length is measured in Unicode code points (not bytes),
 * so multibyte characters (CJK, emoji) each count as 1.
 */
export function checkDescriptionLength(
  input: RuleInput,
  options: DescriptionLengthRuleOptions = {}
): DescriptionResult {
  const start = Date.now();
  const min = options.min ?? DEFAULTS.min;
  const max = options.max ?? DEFAULTS.max;
  const expected = { minLength: min, maxLength: max };
  const selector = 'meta[name="description"]';

  const $ = cheerio.load(input.html);
  const metaEl = $('meta[name="description"]');
  const content = metaEl.attr('content');

  if (content === undefined || content === null) {
    return {
      ruleId: 'description-length',
      status: 'fail',
      severity: 'error',
      actual: '',
      expected,
      selector,
      message: `<meta name="description"> is missing. Expected length between ${min} and ${max} characters.\nFix: Add <meta name="description" content="..."> in <head> with a concise summary of the page content.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/snippet',
    };
  }

  const trimmed = content.trim();

  if (!trimmed) {
    return {
      ruleId: 'description-length',
      status: 'fail',
      severity: 'error',
      actual: '',
      expected,
      selector,
      message: `<meta name="description"> content is empty. Expected length between ${min} and ${max} characters.\nFix: Set the content attribute to a descriptive summary of the page (${min}–${max} characters).`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/snippet',
    };
  }

  // Count Unicode code points (handles multibyte chars correctly)
  const length = [...trimmed].length;

  if (length < min) {
    return {
      ruleId: 'description-length',
      status: 'fail',
      severity: 'error',
      actual: trimmed,
      expected,
      selector,
      message: `<meta name="description"> is too short: ${length} chars (min: ${min}, max: ${max}). Content: "${trimmed}"\nFix: Expand the description to at least ${min} characters. Include the primary keyword and a clear value proposition.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/snippet',
    };
  }

  if (length > max) {
    return {
      ruleId: 'description-length',
      status: 'fail',
      severity: 'error',
      actual: trimmed,
      expected,
      selector,
      message: `<meta name="description"> is too long: ${length} chars (max: ${max}, min: ${min}). Content: "${trimmed}"\nFix: Shorten the description to ${max} characters or fewer. Search engines may truncate longer descriptions in results.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/snippet',
    };
  }

  return {
    ruleId: 'description-length',
    status: 'pass',
    severity: 'error',
    actual: trimmed,
    expected,
    selector,
    message: `<meta name="description"> length is ${length} chars — within range [${min}, ${max}].`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/appearance/snippet',
  };
}
