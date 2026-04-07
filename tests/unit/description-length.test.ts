import { test, expect } from '@playwright/test';
import { checkDescriptionLength } from '../../src/rules/description-length.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string, url = 'https://example.com/'): RuleInput {
  return { html, url, context: 'static' };
}

function makeHtml(content: string | null): string {
  if (content === null) {
    return '<html><head></head></html>';
  }
  return `<html><head><meta name="description" content="${content}"></head></html>`;
}

test.describe('description-length rule', () => {
  test('passes when description is within default range', () => {
    const content = 'This is an adequate meta description for the page that falls within the required character range.';
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('pass');
    expect(result.ruleId).toBe('description-length');
  });

  test('fails when meta description is missing', () => {
    const result = checkDescriptionLength(makeInput(makeHtml(null)));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('missing');
    expect(result.actual).toBe('');
  });

  test('fails when meta description content is empty string', () => {
    const result = checkDescriptionLength(makeInput(makeHtml('')));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('empty');
  });

  test('fails when description is too short', () => {
    const result = checkDescriptionLength(makeInput(makeHtml('Too short')));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('too short');
    expect(result.message).toContain('9 chars');
  });

  test('fails when description is too long', () => {
    const content = 'A'.repeat(165);
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('too long');
    expect(result.message).toContain('165 chars');
  });

  test('passes exactly at min boundary (70)', () => {
    const content = 'A'.repeat(70);
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('pass');
  });

  test('passes exactly at max boundary (160)', () => {
    const content = 'A'.repeat(160);
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('pass');
  });

  test('fails 1 char below min', () => {
    const content = 'A'.repeat(69);
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('fail');
  });

  test('fails 1 char above max', () => {
    const content = 'A'.repeat(161);
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('fail');
  });

  test('respects custom min/max options', () => {
    const content = 'Short desc.';  // 11 chars — fails default but passes custom
    const failResult = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(failResult.status).toBe('fail');

    const passResult = checkDescriptionLength(makeInput(makeHtml(content)), { min: 5, max: 20 });
    expect(passResult.status).toBe('pass');
  });

  test('counts multibyte (CJK) characters as 1 each', () => {
    // 70+ Japanese chars
    const content = 'これはSEOテスト用のメタディスクリプションです。ページの内容を適切に説明し、ユーザーが検索結果からクリックしたくなる文章を書くことが重要です。';
    const charCount = [...content].length;
    expect(charCount).toBeGreaterThanOrEqual(70);

    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.status).toBe('pass');
  });

  test('trims whitespace before measuring length', () => {
    // "   Short   " trims to "Short" (5 chars) — fails min of 70
    const result = checkDescriptionLength(makeInput(makeHtml('   Short   ')));
    expect(result.status).toBe('fail');
  });

  test('result includes helpUrl', () => {
    const result = checkDescriptionLength(makeInput(makeHtml('test')));
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });

  test('result includes duration', () => {
    const content = 'A'.repeat(100);
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('result contains actual content on failure', () => {
    const content = 'Too short';
    const result = checkDescriptionLength(makeInput(makeHtml(content)));
    expect(result.actual).toBe(content);
    expect(result.message).toContain(content);
  });

  test('selector points to meta[name="description"]', () => {
    const result = checkDescriptionLength(makeInput(makeHtml(null)));
    expect(result.selector).toBe('meta[name="description"]');
  });
});
