import { test, expect } from '@playwright/test';
import { parseRobotsTxtForTest, findUnintendedBlocksForTest, hasSitemapDirectiveForTest } from '../../src/rules/robots-txt.js';

// Note: checkRobotsTxt() makes real HTTP requests, so we test internal helpers
// by exporting them. The integration path is covered by E2E tests.

test.describe('robots-txt rule — internal parsing helpers', () => {
  test('parseRobotsTxt: parses simple user-agent + disallow block', () => {
    const content = `
User-agent: *
Disallow: /admin/
Allow: /
Sitemap: https://example.com/sitemap.xml
    `.trim();

    const entries = parseRobotsTxtForTest(content);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.userAgent).toBe('*');
    expect(entries[0]?.directives).toContainEqual({ directive: 'disallow', value: '/admin/' });
    expect(entries[0]?.directives).toContainEqual({ directive: 'allow', value: '/' });
  });

  test('parseRobotsTxt: parses multiple user-agent blocks', () => {
    const content = `
User-agent: Googlebot
Disallow: /nogoogle/

User-agent: *
Disallow: /private/
    `.trim();

    const entries = parseRobotsTxtForTest(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.userAgent).toBe('Googlebot');
    expect(entries[1]?.userAgent).toBe('*');
  });

  test('parseRobotsTxt: strips inline comments', () => {
    const content = `
User-agent: * # all bots
Disallow: /secret/ # private area
    `.trim();

    const entries = parseRobotsTxtForTest(content);
    expect(entries[0]?.userAgent).toBe('*');
    expect(entries[0]?.directives[0]?.value).toBe('/secret/');
  });

  test('findUnintendedBlocks: returns empty when no Disallow: / found', () => {
    const entries = parseRobotsTxtForTest('User-agent: *\nDisallow: /admin/');
    const issues = findUnintendedBlocksForTest(entries);
    expect(issues).toHaveLength(0);
  });

  test('findUnintendedBlocks: detects Disallow: / for all agents', () => {
    const entries = parseRobotsTxtForTest('User-agent: *\nDisallow: /');
    const issues = findUnintendedBlocksForTest(entries);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('all crawlers');
  });

  test('findUnintendedBlocks: detects Disallow: / for specific agent', () => {
    const entries = parseRobotsTxtForTest('User-agent: Googlebot\nDisallow: /');
    const issues = findUnintendedBlocksForTest(entries);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('"Googlebot"');
  });

  test('hasSitemapDirective: returns true when Sitemap: present', () => {
    const content = 'User-agent: *\nDisallow:\nSitemap: https://example.com/sitemap.xml';
    expect(hasSitemapDirectiveForTest(content)).toBe(true);
  });

  test('hasSitemapDirective: returns false when Sitemap: absent', () => {
    const content = 'User-agent: *\nDisallow: /admin/';
    expect(hasSitemapDirectiveForTest(content)).toBe(false);
  });

  test('hasSitemapDirective: case-insensitive match', () => {
    const content = 'User-agent: *\nsitemap: https://example.com/sitemap.xml';
    expect(hasSitemapDirectiveForTest(content)).toBe(true);
  });
});
