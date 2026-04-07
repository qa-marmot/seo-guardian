import * as cheerio from 'cheerio';
import type { TitleResult, RuleInput } from '../types.js';

export type TitleLengthRuleOptions = {
  min?: number;
  max?: number;
};

const DEFAULTS = {
  min: 30,
  max: 60,
} as const;

/**
 * Validates the <title> tag existence and character length.
 *
 * Pass: title exists and length is within [min, max]
 * Fail: title missing, or length out of range
 *
 * Note: length is measured in Unicode code points (not bytes),
 * so multibyte characters (CJK, emoji) each count as 1.
 */
export function checkTitleLength(
  input: RuleInput,
  options: TitleLengthRuleOptions = {}
): TitleResult {
  const start = Date.now();
  const min = options.min ?? DEFAULTS.min;
  const max = options.max ?? DEFAULTS.max;
  const expected = { minLength: min, maxLength: max };

  const $ = cheerio.load(input.html);
  const titleEl = $('title');
  const title = titleEl.text().trim();

  if (!title) {
    return {
      ruleId: 'title-length',
      status: 'fail',
      severity: 'error',
      actual: '',
      expected,
      selector: 'title',
      message: `<title> tag is missing or empty. Expected length between ${min} and ${max} characters.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    };
  }

  // Count Unicode code points (handles multibyte chars correctly)
  const length = [...title].length;

  if (length < min) {
    return {
      ruleId: 'title-length',
      status: 'fail',
      severity: 'error',
      actual: title,
      expected,
      selector: 'title',
      message: `<title> is too short: ${length} chars (min: ${min}). Current value: "${title}"`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    };
  }

  if (length > max) {
    return {
      ruleId: 'title-length',
      status: 'fail',
      severity: 'error',
      actual: title,
      expected,
      selector: 'title',
      message: `<title> is too long: ${length} chars (max: ${max}). Current value: "${title}"`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    };
  }

  return {
    ruleId: 'title-length',
    status: 'pass',
    severity: 'error',
    actual: title,
    expected,
    selector: 'title',
    message: `<title> length is ${length} chars — within range [${min}, ${max}].`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/appearance/title-link',
  };
}
