import * as cheerio from 'cheerio';
import type { ImgAltResult, RuleInput } from '../types.js';

/** Pattern matching bare filenames like "image001.jpg" or "photo.PNG" as alt text */
const FILENAME_PATTERN = /^[\w\-. ]+\.(jpe?g|png|gif|webp|avif|svg|bmp|ico)$/i;

export type ImgAltViolation = {
  src: string;
  alt: string | null;
  reason: 'missing' | 'empty' | 'filename';
};

/**
 * Validates that all <img> elements have appropriate alt attributes.
 *
 * Checks:
 * 1. alt attribute must be present (missing = fail)
 * 2. Decorative images (alt="") are allowed
 * 3. alt text must not be just a filename (e.g., "photo.jpg")
 *
 * Pass: all img elements have alt attributes that aren't bare filenames
 * Fail: any img missing alt, or using a filename as alt text
 */
export function checkImgAlt(input: RuleInput): ImgAltResult {
  const start = Date.now();

  const $ = cheerio.load(input.html);
  const violations: ImgAltViolation[] = [];
  const allImages: { src: string; alt: string | null }[] = [];

  $('img').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    const altAttr = $(el).attr('alt');

    // alt attribute completely missing
    if (altAttr === undefined) {
      violations.push({ src, alt: null, reason: 'missing' });
      allImages.push({ src, alt: null });
      return;
    }

    allImages.push({ src, alt: altAttr });

    // Empty string is valid (decorative image)
    if (altAttr === '') return;

    // Check if alt text looks like a filename
    if (FILENAME_PATTERN.test(altAttr.trim())) {
      violations.push({ src, alt: altAttr, reason: 'filename' });
    }
  });

  if (violations.length > 0) {
    const details = violations.map((v) => {
      const srcLabel = v.src ? `src="${v.src}"` : 'unknown src';
      if (v.reason === 'missing') {
        return `<img ${srcLabel}> is missing alt attribute`;
      }
      if (v.reason === 'filename') {
        return `<img ${srcLabel}> has filename-only alt="${v.alt}"`;
      }
      return `<img ${srcLabel}> has empty alt attribute`;
    });

    return {
      ruleId: 'img-alt',
      status: 'fail',
      severity: 'error',
      actual: allImages,
      expected: { allPresent: true },
      selector: 'img',
      message: `Found ${violations.length} img alt issue(s) out of ${allImages.length} total image(s):\n${details.map((d) => `  - ${d}`).join('\n')}\nFix:\n  - Missing alt: add alt="description of image" (or alt="" for decorative images)\n  - Filename alt: replace with a descriptive phrase (e.g., alt="Team photo at product launch")`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/appearance/google-images#use-descriptive-alt-text',
    };
  }

  return {
    ruleId: 'img-alt',
    status: 'pass',
    severity: 'error',
    actual: allImages,
    expected: { allPresent: true },
    selector: 'img',
    message: `All ${allImages.length} img element(s) have valid alt attributes.`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/appearance/google-images#use-descriptive-alt-text',
  };
}
