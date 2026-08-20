import type {
  PageConfig,
  RuleInput,
  SeoConfig,
  Severity,
  TestResult,
} from '../types.js';
import { resolveConfig, resolvePageRules } from '../config.js';
import { checkBrokenLinks } from '../rules/broken-links.js';
import { checkCanonical } from '../rules/canonical.js';
import { checkDescriptionLength } from '../rules/description-length.js';
import { checkH1Single } from '../rules/h1-single.js';
import { checkHreflang } from '../rules/hreflang.js';
import { checkImgAlt } from '../rules/img-alt.js';
import { checkLang } from '../rules/lang.js';
import { checkNoindex } from '../rules/noindex.js';
import { checkOgRequired } from '../rules/og-required.js';
import { checkRedirectChain } from '../rules/redirect-chain.js';
import { checkRobotsTxt } from '../rules/robots-txt.js';
import { checkStructuredData } from '../rules/structured-data.js';
import { checkTitleLength } from '../rules/title-length.js';
import { checkXRobotsTag } from '../rules/x-robots-tag.js';

type RuleSeverityShorthand = 'error' | 'warning' | 'info' | 'off';

function isOff(value: unknown): boolean {
  return value === 'off';
}

function configuredSeverity(value: unknown, fallback: Severity): Severity {
  if (typeof value === 'string' && value !== 'off') {
    return value as Severity;
  }

  if (typeof value === 'object' && value !== null && 'severity' in value) {
    const severity = (value as { severity?: RuleSeverityShorthand }).severity;
    if (severity && severity !== 'off') return severity;
  }

  return fallback;
}

/**
 * Rule functions report their intrinsic result severity. The engine applies
 * the severity selected in seo.config.ts consistently to every registered
 * rule, converting non-error violations to report-only warnings.
 */
function applyConfiguredSeverity(result: TestResult, ruleConfig: unknown): TestResult {
  const severity = configuredSeverity(ruleConfig, result.severity);
  const status = result.status === 'pass'
    ? 'pass'
    : severity === 'error'
      ? 'fail'
      : 'warn';

  return { ...result, severity, status };
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
  const pagePath = new URL(url, resolved.baseUrl).pathname;
  const rules = pageConfig?.rules
    ? { ...resolved.rules, ...pageConfig.rules }
    : resolvePageRules(resolved, pagePath);

  const input: RuleInput = responseHeaders
    ? { html, url, context: 'static', responseHeaders }
    : { html, url, context: 'static' };
  const results: TestResult[] = [];
  const addResult = (result: TestResult, ruleConfig: unknown): void => {
    results.push(applyConfiguredSeverity(result, ruleConfig));
  };

  // title-length
  const titleRule = rules['title-length'];
  if (!isOff(titleRule)) {
    const options = typeof titleRule === 'object' ? titleRule : {};
    addResult(
      checkTitleLength(input, options as { min?: number; max?: number }),
      titleRule
    );
  }

  // description-length
  const descriptionRule = rules['description-length'];
  if (!isOff(descriptionRule)) {
    const options = typeof descriptionRule === 'object' ? descriptionRule : {};
    addResult(
      checkDescriptionLength(input, options as { min?: number; max?: number }),
      descriptionRule
    );
  }

  // h1-single
  const h1Rule = rules['h1-single'];
  if (!isOff(h1Rule)) {
    addResult(checkH1Single(input), h1Rule);
  }

  // lang
  const langRule = rules.lang;
  if (!isOff(langRule)) {
    addResult(checkLang(input), langRule);
  }

  // canonical
  const canonicalRule = rules.canonical;
  if (!isOff(canonicalRule)) {
    const options = typeof canonicalRule === 'object' ? canonicalRule : {};
    addResult(checkCanonical(input, options as { expectedUrl?: string }), canonicalRule);
  }

  // noindex
  const noindexRule = rules.noindex;
  if (!isOff(noindexRule)) {
    addResult(checkNoindex(input), noindexRule);
  }

  // og-required
  const ogRule = rules['og-required'];
  if (!isOff(ogRule)) {
    const options = typeof ogRule === 'object' ? ogRule : {};
    addResult(checkOgRequired(input, options as { tags?: string[] }), ogRule);
  }

  // img-alt
  const imgAltRule = rules['img-alt'];
  if (!isOff(imgAltRule)) {
    addResult(checkImgAlt(input), imgAltRule);
  }

  // structured-data
  const structuredDataRule = rules['structured-data'];
  if (!isOff(structuredDataRule)) {
    const options = typeof structuredDataRule === 'object' ? structuredDataRule : {};
    addResult(
      checkStructuredData(input, options as { required?: string[] }),
      structuredDataRule
    );
  }

  // hreflang
  const hreflangRule = rules.hreflang;
  if (!isOff(hreflangRule)) {
    addResult(checkHreflang(input), hreflangRule);
  }

  // robots-txt — site-level network check
  const robotsTxtRule = rules['robots-txt'];
  if (!isOff(robotsTxtRule)) {
    addResult(await checkRobotsTxt(resolved.baseUrl, input), robotsTxtRule);
  }

  // x-robots-tag — uses responseHeaders from input
  const xRobotsTagRule = rules['x-robots-tag'];
  if (!isOff(xRobotsTagRule)) {
    addResult(checkXRobotsTag(input), xRobotsTagRule);
  }

  // broken-links — network check
  const brokenLinksRule = rules['broken-links'];
  if (!isOff(brokenLinksRule)) {
    const options = typeof brokenLinksRule === 'object' ? brokenLinksRule : {};
    addResult(
      await checkBrokenLinks(input, options as {
        scope?: 'internal' | 'external' | 'all';
        timeout?: number;
        ignorePatterns?: RegExp[];
        maxConcurrency?: number;
        userAgent?: string;
      }),
      brokenLinksRule
    );
  }

  // redirect-chain — network check
  const redirectChainRule = rules['redirect-chain'];
  if (!isOff(redirectChainRule)) {
    const options = typeof redirectChainRule === 'object' ? redirectChainRule : {};
    addResult(
      await checkRedirectChain(url, input, options as {
        maxChainLength?: number;
        timeout?: number;
        userAgent?: string;
      }),
      redirectChainRule
    );
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

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: HTTP ${response.status} ${response.statusText}`.trim());
  }

  const html = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return runFastMode(html, url, config, undefined, responseHeaders);
}
