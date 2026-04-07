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
      return [discovery.startUrl.startsWith('http')
        ? discovery.startUrl
        : new URL(discovery.startUrl, baseUrl).href];
  }
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
