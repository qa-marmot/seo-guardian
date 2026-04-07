import type { TestResult, RuleInput, SeoConfig, PageConfig } from '../types.js';
import { checkTitleLength } from '../rules/title-length.js';
import { checkDescriptionLength } from '../rules/description-length.js';
import { checkH1Single } from '../rules/h1-single.js';
import { checkLang } from '../rules/lang.js';
import { checkCanonical } from '../rules/canonical.js';
import { checkNoindex } from '../rules/noindex.js';
import { checkOgRequired } from '../rules/og-required.js';
import { checkImgAlt } from '../rules/img-alt.js';
import { resolveConfig, resolvePageRules } from '../config.js';

type RuleSeverityShorthand = 'error' | 'warning' | 'info' | 'off';

function isOff(value: unknown): boolean {
  return value === 'off';
}

function toSeverityShorthand(value: unknown): RuleSeverityShorthand {
  if (typeof value === 'string') return value as RuleSeverityShorthand;
  if (typeof value === 'object' && value !== null && 'severity' in value) {
    return (value as { severity: RuleSeverityShorthand }).severity;
  }
  return 'error';
}

/**
 * Fast Mode engine: runs all enabled rules using cheerio static HTML analysis.
 * No browser required — suitable for server-rendered HTML.
 */
export async function runFastMode(
  html: string,
  url: string,
  config: SeoConfig,
  pageConfig?: PageConfig,
  responseHeaders?: Record<string, string>
): Promise<TestResult[]> {
  const resolved = resolveConfig(config);
  const pagePath = new URL(url, config.baseUrl).pathname;
  const rules = resolvePageRules(resolved, pagePath);

  const input: RuleInput = { html, url, context: 'static', responseHeaders };
  const results: TestResult[] = [];

  // title-length
  const titleRule = rules['title-length'];
  if (!isOff(titleRule)) {
    const opts = typeof titleRule === 'object' ? titleRule : {};
    const r = checkTitleLength(input, opts as { min?: number; max?: number });
    if (toSeverityShorthand(titleRule) !== 'off') {
      results.push({ ...r, severity: toSeverityShorthand(titleRule) === 'warning' ? 'warning' : r.severity });
    }
  }

  // description-length
  const descRule = rules['description-length'];
  if (!isOff(descRule)) {
    const opts = typeof descRule === 'object' ? descRule : {};
    const r = checkDescriptionLength(input, opts as { min?: number; max?: number });
    results.push(r);
  }

  // h1-single
  if (!isOff(rules['h1-single'])) {
    results.push(checkH1Single(input));
  }

  // lang
  if (!isOff(rules['lang'])) {
    results.push(checkLang(input));
  }

  // canonical
  if (!isOff(rules['canonical'])) {
    results.push(checkCanonical(input));
  }

  // noindex
  if (!isOff(rules['noindex'])) {
    results.push(checkNoindex(input));
  }

  // og-required
  const ogRule = rules['og-required'];
  if (!isOff(ogRule)) {
    const opts = typeof ogRule === 'object' ? ogRule : {};
    results.push(checkOgRequired(input, opts as { tags?: string[] }));
  }

  // img-alt
  if (!isOff(rules['img-alt'])) {
    results.push(checkImgAlt(input));
  }

  return results;
}

/**
 * Fetch HTML from a URL and run Fast Mode analysis.
 */
export async function fetchAndAnalyze(
  url: string,
  config: SeoConfig
): Promise<TestResult[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'seo-guardian/0.1 (CI SEO test bot)' },
  });

  const html = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return runFastMode(html, url, config, undefined, responseHeaders);
}
