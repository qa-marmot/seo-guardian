import * as cheerio from 'cheerio';
import type { LangResult, RuleInput } from '../types.js';

/**
 * Validates that the <html> element has a non-empty lang attribute.
 *
 * Pass: html[lang] exists and is non-empty
 * Fail: lang attribute missing or empty
 */
export function checkLang(input: RuleInput): LangResult {
  const start = Date.now();

  const $ = cheerio.load(input.html);
  const lang = $('html').attr('lang');

  if (lang === undefined || lang === null) {
    return {
      ruleId: 'lang',
      status: 'fail',
      severity: 'error',
      actual: null,
      expected: { present: true },
      selector: 'html',
      message: '<html> element is missing the lang attribute. Add lang="en" (or appropriate language code).',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/specialty/international/localization',
    };
  }

  const trimmedLang = lang.trim();

  if (!trimmedLang) {
    return {
      ruleId: 'lang',
      status: 'fail',
      severity: 'error',
      actual: '',
      expected: { present: true },
      selector: 'html',
      message: '<html lang=""> is empty. Provide a valid BCP 47 language tag (e.g., "en", "ja", "en-US").',
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/specialty/international/localization',
    };
  }

  return {
    ruleId: 'lang',
    status: 'pass',
    severity: 'error',
    actual: trimmedLang,
    expected: { present: true },
    selector: 'html',
    message: `<html lang="${trimmedLang}"> is present.`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/specialty/international/localization',
  };
}
