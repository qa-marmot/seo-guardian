import { load } from 'cheerio';
import type { DiscoveryConfig } from '../types.js';

/**
 * Discover URLs to test based on the discovery configuration.
 */
export async function discoverUrls(
  baseUrl: string,
  discovery: DiscoveryConfig
): Promise<string[]> {
  switch (discovery.type) {
    case 'list':
      return discovery.urls.map((path) =>
        path.startsWith('http') ? path : new URL(path, baseUrl).href
      );

    case 'sitemap':
      return fetchSitemapUrls(baseUrl, discovery.url, discovery.limit);

    case 'crawl':
      return crawlUrls(baseUrl, discovery.startUrl, discovery.limit);
  }
}

/**
 * Breadth-first, same-origin discovery for static HTML links.
 *
 * This deliberately does not execute JavaScript or authenticate. It gives the
 * CLI a predictable bounded set of documents; use page-level Full Mode for
 * rendering-dependent checks.
 */
async function crawlUrls(
  baseUrl: string,
  startUrl: string,
  limit = 100
): Promise<string[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Crawl discovery limit must be a positive integer.');
  }

  const origin = new URL(baseUrl).origin;
  const start = normalizeCrawlUrl(startUrl, baseUrl);
  if (start.origin !== origin) {
    throw new Error('Crawl discovery startUrl must use the same origin as baseUrl.');
  }

  const queue = [start.href];
  const queued = new Set(queue);
  const visited = new Set<string>();

  while (queue.length > 0 && visited.size < limit) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;

    visited.add(current);

    const response = await fetch(current);
    if (!response.ok) continue;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) continue;

    const html = await response.text();
    const $ = load(html);

    $('a[href]').each((_index, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      let candidate: URL;
      try {
        candidate = normalizeCrawlUrl(href, current);
      } catch {
        return;
      }

      if (candidate.origin !== origin || visited.has(candidate.href) || queued.has(candidate.href)) {
        return;
      }

      queue.push(candidate.href);
      queued.add(candidate.href);
    });
  }

  return [...visited];
}

function normalizeCrawlUrl(value: string, baseUrl: string): URL {
  const url = new URL(value, baseUrl);
  url.hash = '';
  return url;
}

async function fetchSitemapUrls(
  baseUrl: string,
  sitemapPath: string,
  limit?: number
): Promise<string[]> {
  const sitemapUrl = sitemapPath.startsWith('http')
    ? sitemapPath
    : new URL(sitemapPath, baseUrl).href;

  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap at ${sitemapUrl}: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const urls = extractUrlsFromSitemap(xml);

  return limit ? urls.slice(0, limit) : urls;
}

function extractUrlsFromSitemap(xml: string): string[] {
  // Extract <loc> tag values from sitemap XML
  const locRegex = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = locRegex.exec(xml)) !== null) {
    if (match[1]) {
      urls.push(match[1].trim());
    }
  }

  return urls;
}
