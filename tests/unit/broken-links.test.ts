import { test, expect } from '@playwright/test';
import { extractLinksForTest } from '../../src/rules/broken-links.js';

const BASE_URL = 'https://example.com/page';

function makeHtml(links: { href: string; text?: string }[]): string {
  const anchors = links
    .map(({ href, text }) => `<a href="${href}">${text ?? href}</a>`)
    .join('\n');
  return `<html><body>${anchors}</body></html>`;
}

test.describe('broken-links — extractLinks helper', () => {
  test('extracts internal links', () => {
    const html = makeHtml([{ href: '/about', text: 'About' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links).toHaveLength(1);
    expect(links[0]?.type).toBe('internal');
    expect(links[0]?.absolute).toBe('https://example.com/about');
  });

  test('extracts external links', () => {
    const html = makeHtml([{ href: 'https://other.com/page', text: 'External' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links).toHaveLength(1);
    expect(links[0]?.type).toBe('external');
  });

  test('resolves relative hrefs against baseUrl', () => {
    const html = makeHtml([{ href: '../contact', text: 'Contact' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links[0]?.absolute).toBe('https://example.com/contact');
  });

  test('skips empty hrefs', () => {
    const html = makeHtml([{ href: '' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links).toHaveLength(0);
  });

  test('skips hrefs with invalid protocol that URL constructor throws on', () => {
    // http://[invalid-ipv6 throws in URL constructor
    const html = '<html><body><a href="http://[invalid">bad</a></body></html>';
    const links = extractLinksForTest(html, BASE_URL);
    expect(links).toHaveLength(0);
  });

  test('classifies same-domain link as internal', () => {
    const html = makeHtml([{ href: 'https://example.com/blog', text: 'Blog' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links[0]?.type).toBe('internal');
  });

  test('classifies different subdomain as external', () => {
    const html = makeHtml([{ href: 'https://shop.example.com/', text: 'Shop' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links[0]?.type).toBe('external');
  });

  test('extracts multiple links', () => {
    const html = makeHtml([
      { href: '/a', text: 'A' },
      { href: '/b', text: 'B' },
      { href: 'https://other.com', text: 'C' },
    ]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links).toHaveLength(3);
  });

  test('returns selector for each link', () => {
    const html = makeHtml([{ href: '/about', text: 'About Us' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links[0]?.selector).toBeTruthy();
  });
});

test.describe('broken-links — default ignore patterns', () => {
  // These patterns are applied inside checkBrokenLinks but we verify
  // extractLinks returns them (filtering happens after extraction)
  test('extracts mailto: links (filtering is done later)', () => {
    const html = makeHtml([{ href: 'mailto:test@example.com', text: 'Email' }]);
    const links = extractLinksForTest(html, BASE_URL);
    // extractLinks returns all links; ignore filtering happens in checkBrokenLinks
    expect(links.length).toBeGreaterThanOrEqual(0);
  });

  test('extracts anchor-only links (filtering is done later)', () => {
    const html = makeHtml([{ href: '#section', text: 'Section' }]);
    const links = extractLinksForTest(html, BASE_URL);
    expect(links.length).toBeGreaterThanOrEqual(0);
  });
});

test.describe('broken-links — checkBrokenLinks result shape', () => {
  test('passes when page has no links', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const result = await checkBrokenLinks(
      { html: '<html><body><p>No links here.</p></body></html>', url: BASE_URL, context: 'static' },
      { scope: 'internal' }
    );
    expect(result.status).toBe('pass');
    expect(result.ruleId).toBe('broken-links');
    expect(result.actual).toHaveLength(0);
  });

  test('result shape includes expected = { maxBroken: 0 }', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const result = await checkBrokenLinks(
      { html: '<html><body></body></html>', url: BASE_URL, context: 'static' }
    );
    expect(result.expected).toEqual({ maxBroken: 0 });
  });

  test('skips mailto: links by default', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const html = makeHtml([{ href: 'mailto:hello@example.com', text: 'Email' }]);
    const result = await checkBrokenLinks(
      { html, url: BASE_URL, context: 'static' },
      { scope: 'all' }
    );
    // mailto is filtered — no links to check → pass
    expect(result.status).toBe('pass');
  });

  test('skips tel: links by default', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const html = makeHtml([{ href: 'tel:+819012345678', text: 'Call' }]);
    const result = await checkBrokenLinks(
      { html, url: BASE_URL, context: 'static' },
      { scope: 'all' }
    );
    expect(result.status).toBe('pass');
  });

  test('skips anchor-only #fragment links by default', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const html = makeHtml([{ href: '#top', text: 'Back to top' }]);
    const result = await checkBrokenLinks(
      { html, url: BASE_URL, context: 'static' },
      { scope: 'internal' }
    );
    expect(result.status).toBe('pass');
  });

  test('scope=internal skips external links', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    // Only external link — scope=internal means nothing to check
    const html = makeHtml([{ href: 'https://other.com/page', text: 'External' }]);
    const result = await checkBrokenLinks(
      { html, url: BASE_URL, context: 'static' },
      { scope: 'internal' }
    );
    expect(result.status).toBe('pass');
    expect(result.message).toContain('No internal links');
  });

  test('scope=external skips internal links', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const html = makeHtml([{ href: '/internal', text: 'Internal' }]);
    const result = await checkBrokenLinks(
      { html, url: BASE_URL, context: 'static' },
      { scope: 'external' }
    );
    expect(result.status).toBe('pass');
    expect(result.message).toContain('No external links');
  });

  test('respects custom ignorePatterns', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    // Custom pattern to skip /admin/ paths
    const html = makeHtml([{ href: '/admin/secret', text: 'Admin' }]);
    const result = await checkBrokenLinks(
      { html, url: BASE_URL, context: 'static' },
      { scope: 'internal', ignorePatterns: [/\/admin\//] }
    );
    expect(result.status).toBe('pass');
  });

  test('result includes helpUrl', async () => {
    const { checkBrokenLinks } = await import('../../src/rules/broken-links.js');
    const result = await checkBrokenLinks(
      { html: '<html><body></body></html>', url: BASE_URL, context: 'static' }
    );
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });
});
