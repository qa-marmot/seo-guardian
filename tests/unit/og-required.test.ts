import { test, expect } from '@playwright/test';
import { checkOgRequired } from '../../src/rules/og-required.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string): RuleInput {
  return { html, url: 'https://example.com/', context: 'static' };
}

function makeHtmlWithOg(tags: Record<string, string>): string {
  const metas = Object.entries(tags)
    .map(([property, content]) => `<meta property="${property}" content="${content}">`)
    .join('\n    ');
  return `<html><head>\n    ${metas}\n  </head></html>`;
}

const ALL_OG_TAGS = {
  'og:title': 'Page Title',
  'og:description': 'Page description text here',
  'og:url': 'https://example.com/',
  'og:image': 'https://example.com/image.jpg',
};

test.describe('og-required rule', () => {
  test('passes when all 4 default OGP tags are present', () => {
    const html = makeHtmlWithOg(ALL_OG_TAGS);
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.ruleId).toBe('og-required');
  });

  test('fails when og:title is missing', () => {
    const { 'og:title': _, ...rest } = ALL_OG_TAGS;
    const html = makeHtmlWithOg(rest);
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:title');
  });

  test('fails when og:description is missing', () => {
    const { 'og:description': _, ...rest } = ALL_OG_TAGS;
    const html = makeHtmlWithOg(rest);
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:description');
  });

  test('fails when og:url is missing', () => {
    const { 'og:url': _, ...rest } = ALL_OG_TAGS;
    const html = makeHtmlWithOg(rest);
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:url');
  });

  test('fails when og:image is missing', () => {
    const { 'og:image': _, ...rest } = ALL_OG_TAGS;
    const html = makeHtmlWithOg(rest);
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:image');
  });

  test('fails when og:title has empty content', () => {
    const html = makeHtmlWithOg({ ...ALL_OG_TAGS, 'og:title': '' });
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:title');
  });

  test('fails when og:title content is only whitespace', () => {
    const html = makeHtmlWithOg({ ...ALL_OG_TAGS, 'og:title': '   ' });
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('fails when no OGP tags at all', () => {
    const html = '<html><head></head></html>';
    const result = checkOgRequired(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:title');
    expect(result.message).toContain('og:image');
  });

  test('respects custom tags option', () => {
    const html = makeHtmlWithOg({ 'og:title': 'Title', 'og:type': 'website' });
    // Custom: only require og:title and og:type
    const result = checkOgRequired(makeInput(html), { tags: ['og:title', 'og:type'] });
    expect(result.status).toBe('pass');
  });

  test('fails with custom tags when one is missing', () => {
    const html = makeHtmlWithOg({ 'og:title': 'Title' });
    const result = checkOgRequired(makeInput(html), { tags: ['og:title', 'og:type'] });
    expect(result.status).toBe('fail');
    expect(result.message).toContain('og:type');
  });

  test('actual contains all present og tags', () => {
    const html = makeHtmlWithOg(ALL_OG_TAGS);
    const result = checkOgRequired(makeInput(html));
    expect(result.actual).toMatchObject({
      'og:title': 'Page Title',
      'og:image': 'https://example.com/image.jpg',
    });
  });

  test('result includes helpUrl pointing to ogp.me', () => {
    const html = '<html><head></head></html>';
    const result = checkOgRequired(makeInput(html));
    expect(result.helpUrl).toContain('ogp.me');
  });
});
