import * as cheerio from 'cheerio';
import type { OgResult, RuleInput } from '../types.js';

export type OgRequiredRuleOptions = {
  /** OGP tags to require. Defaults to the 4 essential tags. */
  tags?: string[];
};

const DEFAULT_REQUIRED_TAGS = [
  'og:title',
  'og:description',
  'og:url',
  'og:image',
] as const;

/**
 * Validates the presence of required Open Graph meta tags.
 *
 * Pass: all required og: tags exist with non-empty content
 * Fail: one or more required tags are missing or have empty content
 */
export function checkOgRequired(
  input: RuleInput,
  options: OgRequiredRuleOptions = {}
): OgResult {
  const start = Date.now();
  const requiredTags = options.tags ?? [...DEFAULT_REQUIRED_TAGS];

  const $ = cheerio.load(input.html);

  // Collect all present og: tags
  const presentTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr('property');
    const content = $(el).attr('content');
    if (property && content !== undefined) {
      presentTags[property] = content;
    }
  });

  const missingTags = requiredTags.filter(
    (tag) => !presentTags[tag] || !presentTags[tag]!.trim()
  );

  if (missingTags.length > 0) {
    return {
      ruleId: 'og-required',
      status: 'fail',
      severity: 'error',
      actual: presentTags,
      expected: { required: requiredTags },
      selector: 'meta[property^="og:"]',
      message: `Missing or empty required OGP tags: ${missingTags.map((t) => `<meta property="${t}">`).join(', ')}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://ogp.me/',
    };
  }

  return {
    ruleId: 'og-required',
    status: 'pass',
    severity: 'error',
    actual: presentTags,
    expected: { required: requiredTags },
    selector: 'meta[property^="og:"]',
    message: `All required OGP tags present: ${requiredTags.join(', ')}`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://ogp.me/',
  };
}
