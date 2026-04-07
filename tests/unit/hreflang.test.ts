import { test, expect } from '@playwright/test';
import { checkHreflang } from '../../src/rules/hreflang.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string): RuleInput {
  return { html, url: 'https://example.com/', context: 'static' };
}

function makeHtml(links: { hreflang: string; href: string }[]): string {
  const tags = links
    .map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${l.href}">`)
    .join('\n    ');
  return `<html><head>\n    ${tags}\n  </head></html>`;
}

test.describe('hreflang rule', () => {
  test('passes when page has no hreflang annotations', () => {
    const html = '<html><head></head></html>';
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toHaveLength(0);
    expect(result.message).toContain('No hreflang');
  });

  test('passes with valid single-language hreflang', () => {
    const html = makeHtml([{ hreflang: 'en', href: 'https://example.com/en/' }]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('passes with multiple languages including x-default', () => {
    const html = makeHtml([
      { hreflang: 'x-default', href: 'https://example.com/' },
      { hreflang: 'en', href: 'https://example.com/en/' },
      { hreflang: 'ja', href: 'https://example.com/ja/' },
    ]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toHaveLength(3);
  });

  test('passes with locale-specific lang codes', () => {
    const html = makeHtml([
      { hreflang: 'x-default', href: 'https://example.com/' },
      { hreflang: 'en-US', href: 'https://example.com/en-us/' },
      { hreflang: 'zh-TW', href: 'https://example.com/zh-tw/' },
    ]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('fails when multiple hreflang links lack x-default', () => {
    const html = makeHtml([
      { hreflang: 'en', href: 'https://example.com/en/' },
      { hreflang: 'ja', href: 'https://example.com/ja/' },
    ]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('x-default');
  });

  test('fails on invalid hreflang value', () => {
    const html = makeHtml([{ hreflang: 'english', href: 'https://example.com/en/' }]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('not a valid BCP 47');
  });

  test('fails on duplicate hreflang values', () => {
    const html = makeHtml([
      { hreflang: 'en', href: 'https://example.com/en/' },
      { hreflang: 'en', href: 'https://example.com/en-alt/' },
    ]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('Duplicate');
  });

  test('fails when href is empty', () => {
    const html = makeHtml([{ hreflang: 'en', href: '' }]);
    const result = checkHreflang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('empty href');
  });

  test('actual contains all parsed entries', () => {
    const html = makeHtml([
      { hreflang: 'x-default', href: 'https://example.com/' },
      { hreflang: 'en', href: 'https://example.com/en/' },
    ]);
    const result = checkHreflang(makeInput(html));
    expect(result.actual).toHaveLength(2);
    expect(result.actual[0]?.hreflang).toBe('x-default');
    expect(result.actual[1]?.hreflang).toBe('en');
  });

  test('severity is always warning', () => {
    const html = '<html><head></head></html>';
    const result = checkHreflang(makeInput(html));
    expect(result.severity).toBe('warning');
  });

  test('result includes helpUrl', () => {
    const html = '<html><head></head></html>';
    const result = checkHreflang(makeInput(html));
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });
});
