import * as cheerio from 'cheerio';
import type { LinkCheckResult, RuleInput } from '../types.js';

export type LinkCheckOptions = {
  scope?: 'internal' | 'external' | 'all';
  timeout?: number;
  ignorePatterns?: RegExp[];
  maxConcurrency?: number;
  userAgent?: string;
  /** Severity for external link failures (default: warn) */
  externalSeverity?: 'error' | 'warning';
};

export type LinkCheckDetail = {
  url: string;
  status: number;
  sourceSelector: string;
  type: 'internal' | 'external';
};

const DEFAULT_IGNORE_PATTERNS = [
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
  /^#/,
  /^data:/i,
];

// Exported for unit testing
export const extractLinksForTest = extractLinks;
export const runConcurrentForTest = runConcurrent;

/**
 * Extract all anchor hrefs from the page HTML.
 */
function extractLinks(
  html: string,
  baseUrl: string
): { href: string; absolute: string; selector: string; type: 'internal' | 'external' }[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links: ReturnType<typeof extractLinks> = [];

  $('a[href]').each((i, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href.trim()) return;

    let absolute: string;
    try {
      absolute = new URL(href, baseUrl).href;
    } catch {
      return; // malformed URL — skip
    }

    const parsed = new URL(absolute);
    const type: 'internal' | 'external' =
      parsed.hostname === base.hostname ? 'internal' : 'external';

    const text = $(el).text().trim().slice(0, 40);
    const selector = text ? `a[href="${href}"]` : `a:nth-child(${i + 1})`;

    links.push({ href, absolute, selector, type });
  });

  return links;
}

/**
 * Check a single URL, following redirects automatically.
 * Returns the final HTTP status code.
 */
async function checkUrl(
  url: string,
  timeout: number,
  userAgent: string
): Promise<number> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': userAgent },
    });
    // Some servers reject HEAD — fall back to GET
    if (response.status === 405) {
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
        headers: { 'User-Agent': userAgent },
      });
      return getResponse.status;
    }
    return response.status;
  } catch {
    return 0; // network error / timeout
  }
}

/**
 * Run URLs in limited concurrency batches.
 */
async function runConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Checks all links on the page for broken URLs (4xx/5xx/network errors).
 *
 * Pass: no broken links found within the specified scope
 * Fail: any internal broken link (or external if scope includes external)
 * Warn: external broken links when scope is 'internal' (advisory)
 *
 * Default scope is 'internal' — external checks require opting in.
 */
export async function checkBrokenLinks(
  input: RuleInput,
  options: LinkCheckOptions = {}
): Promise<LinkCheckResult> {
  const start = Date.now();
  const scope = options.scope ?? 'internal';
  const timeout = options.timeout ?? 5000;
  const maxConcurrency = options.maxConcurrency ?? 5;
  const userAgent = options.userAgent ?? 'seo-guardian/0.1 (link checker)';
  const ignorePatterns = [
    ...DEFAULT_IGNORE_PATTERNS,
    ...(options.ignorePatterns ?? []),
  ];

  // Extract and filter links
  const allLinks = extractLinks(input.html, input.url);

  const filteredLinks = allLinks.filter(({ href, type }) => {
    // Apply ignore patterns against the raw href
    if (ignorePatterns.some((p) => p.test(href))) return false;
    // Apply scope filter
    if (scope === 'internal' && type === 'external') return false;
    if (scope === 'external' && type === 'internal') return false;
    return true;
  });

  // Deduplicate by absolute URL
  const seen = new Set<string>();
  const uniqueLinks = filteredLinks.filter(({ absolute }) => {
    if (seen.has(absolute)) return false;
    seen.add(absolute);
    return true;
  });

  if (uniqueLinks.length === 0) {
    return {
      ruleId: 'broken-links',
      status: 'pass',
      severity: 'error',
      actual: [],
      expected: { maxBroken: 0 },
      message: `No ${scope} links found to check.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
    };
  }

  // Check all links concurrently
  const checkResults = await runConcurrent(
    uniqueLinks,
    async (link) => {
      const status = await checkUrl(link.absolute, timeout, userAgent);
      return { ...link, status };
    },
    maxConcurrency
  );

  const broken: LinkCheckDetail[] = checkResults
    .filter(({ status }) => status === 0 || status >= 400)
    .map(({ absolute, status, selector, type }) => ({
      url: absolute,
      status,
      sourceSelector: selector,
      type,
    }));

  const internalBroken = broken.filter((b) => b.type === 'internal');
  const externalBroken = broken.filter((b) => b.type === 'external');

  if (broken.length === 0) {
    return {
      ruleId: 'broken-links',
      status: 'pass',
      severity: 'error',
      actual: [],
      expected: { maxBroken: 0 },
      message: `All ${uniqueLinks.length} ${scope} link(s) returned valid responses.`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
    };
  }

  // Internal broken = error-level fail; external broken only = warn
  const hasCritical = internalBroken.length > 0 || scope === 'external';
  const status = hasCritical ? 'fail' : 'warn';

  const details = broken.map((b) => {
    const statusLabel = b.status === 0 ? 'TIMEOUT/NETWORK_ERROR' : String(b.status);
    return `  [${b.type}] ${b.url} → ${statusLabel} (found at ${b.sourceSelector})`;
  });

  return {
    ruleId: 'broken-links',
    status,
    severity: 'error',
    actual: broken.map(({ url, status, sourceSelector }) => ({ url, status, sourceSelector })),
    expected: { maxBroken: 0 },
    message: `Found ${broken.length} broken link(s):\n${details.join('\n')}`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
  };
}
