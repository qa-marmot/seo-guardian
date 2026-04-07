import { test, expect } from '@playwright/test';
import { checkStructuredData } from '../../src/rules/structured-data.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string): RuleInput {
  return { html, url: 'https://example.com/', context: 'static' };
}

function makeJsonLdHtml(jsonLd: unknown): string {
  return `<html><head>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head></html>`;
}

const VALID_WEBSITE: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Example Site',
  url: 'https://example.com',
};

const VALID_ARTICLE: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'My Article',
  author: { '@type': 'Person', name: 'Author' },
  datePublished: '2024-01-01',
};

test.describe('structured-data rule', () => {
  // ── Level 1: JSON syntax ──────────────────────────────────────────────────

  test('passes with valid WebSite JSON-LD', () => {
    const result = checkStructuredData(makeInput(makeJsonLdHtml(VALID_WEBSITE)));
    expect(result.status).toBe('pass');
    expect(result.ruleId).toBe('structured-data');
  });

  test('fails on invalid JSON syntax', () => {
    const html = `<html><head>
      <script type="application/ld+json">{ invalid json </script>
    </head></html>`;
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('[L1]');
    expect(result.message).toContain('invalid JSON syntax');
  });

  test('fails when JSON-LD is a JSON array instead of object', () => {
    const html = `<html><head>
      <script type="application/ld+json">[{"@type": "Thing"}]</script>
    </head></html>`;
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('[L1]');
  });

  // ── Level 2: @context / @type ─────────────────────────────────────────────

  test('fails when @context is missing', () => {
    const html = makeJsonLdHtml({ '@type': 'WebSite', name: 'Test', url: 'https://example.com' });
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('[L2]');
    expect(result.message).toContain('@context');
  });

  test('fails when @context is not schema.org', () => {
    const html = makeJsonLdHtml({ '@context': 'https://other.org', '@type': 'WebSite', name: 'X', url: 'https://x.com' });
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('[L2]');
    expect(result.message).toContain('invalid @context');
  });

  test('fails when @type is missing', () => {
    const html = makeJsonLdHtml({ '@context': 'https://schema.org', name: 'Test' });
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('[L2]');
    expect(result.message).toContain('@type');
  });

  // ── Level 3: required fields ──────────────────────────────────────────────

  test('warns when Article is missing required fields', () => {
    const html = makeJsonLdHtml({
      '@context': 'https://schema.org',
      '@type': 'Article',
      // missing: headline, author, datePublished
    });
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('warn');
    expect(result.message).toContain('[L3]');
    expect(result.message).toContain('headline');
    expect(result.message).toContain('author');
    expect(result.message).toContain('datePublished');
  });

  test('passes for Article with all required fields', () => {
    const result = checkStructuredData(makeInput(makeJsonLdHtml(VALID_ARTICLE)));
    expect(result.status).toBe('pass');
  });

  test('passes for unknown @type without L3 error', () => {
    const html = makeJsonLdHtml({
      '@context': 'https://schema.org',
      '@type': 'SomeCustomType',
    });
    // Unknown types skip L3 — only L2 applies
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('pass');
  });

  // ── required types option ─────────────────────────────────────────────────

  test('fails when required type is not present', () => {
    const result = checkStructuredData(
      makeInput(makeJsonLdHtml(VALID_WEBSITE)),
      { required: ['Organization'] }
    );
    expect(result.status).toBe('fail');
    expect(result.message).toContain('Organization');
  });

  test('passes when all required types are present', () => {
    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify(VALID_WEBSITE)}</script>
      <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' })}</script>
    </head></html>`;
    const result = checkStructuredData(makeInput(html), {
      required: ['WebSite', 'Organization'],
    });
    expect(result.status).toBe('pass');
  });

  // ── no JSON-LD on page ────────────────────────────────────────────────────

  test('passes (no required types) when page has no JSON-LD', () => {
    const html = '<html><head></head></html>';
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toHaveLength(0);
  });

  test('fails when page has no JSON-LD but required types are specified', () => {
    const html = '<html><head></head></html>';
    const result = checkStructuredData(makeInput(html), { required: ['WebSite'] });
    expect(result.status).toBe('fail');
    expect(result.message).toContain('No JSON-LD found');
  });

  // ── multiple blocks ───────────────────────────────────────────────────────

  test('reports errors from multiple JSON-LD blocks', () => {
    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify(VALID_WEBSITE)}</script>
      <script type="application/ld+json">{ bad json</script>
    </head></html>`;
    const result = checkStructuredData(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('index 1');
  });

  test('actual contains all successfully parsed items', () => {
    const result = checkStructuredData(makeInput(makeJsonLdHtml(VALID_WEBSITE)));
    expect(result.actual).toHaveLength(1);
    expect((result.actual[0] as Record<string, unknown>)['@type']).toBe('WebSite');
  });

  test('result includes helpUrl', () => {
    const result = checkStructuredData(makeInput('<html><head></head></html>'));
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });

  test('severity is always warning', () => {
    const result = checkStructuredData(makeInput('<html><head></head></html>'));
    expect(result.severity).toBe('warning');
  });
});
