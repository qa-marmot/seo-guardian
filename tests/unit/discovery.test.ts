import { expect, test } from '@playwright/test';
import { discoverUrls } from '../../src/engine/discovery.js';

test('crawl discovery follows same-origin HTML links breadth-first up to its limit', async () => {
  const originalFetch = globalThis.fetch;
  const pages = new Map([
    ['https://example.test/', '<a href="/about#team">About</a><a href="https://other.test/">External</a>'],
    ['https://example.test/about', '<a href="/contact">Contact</a><a href="mailto:hello@example.test">Email</a>'],
    ['https://example.test/contact', '<p>Contact</p>'],
  ]);

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    const body = pages.get(url);
    return new Response(body ?? '', {
      status: body === undefined ? 404 : 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }) as typeof fetch;

  try {
    await expect(discoverUrls('https://example.test', {
      type: 'crawl',
      startUrl: '/',
      limit: 2,
    })).resolves.toEqual([
      'https://example.test/',
      'https://example.test/about',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('crawl discovery rejects cross-origin start URLs', async () => {
  await expect(discoverUrls('https://example.test', {
    type: 'crawl',
    startUrl: 'https://other.test/',
  })).rejects.toThrow('same origin');
});
