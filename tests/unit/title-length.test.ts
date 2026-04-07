import { test, expect } from '@playwright/test';
import { checkTitleLength } from '../../src/rules/title-length.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string, url = 'https://example.com/'): RuleInput {
  return { html, url, context: 'static' };
}

test.describe('title-length rule', () => {
  test('passes when title is within default range', () => {
    const html = '<html><head><title>This is a perfectly fine page title here</title></head></html>';
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.ruleId).toBe('title-length');
  });

  test('fails when title tag is missing', () => {
    const html = '<html><head></head></html>';
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('missing or empty');
    expect(result.actual).toBe('');
  });

  test('fails when title is too short', () => {
    const html = '<html><head><title>Short</title></head></html>';
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('too short');
    expect(result.message).toContain('5 chars');
  });

  test('fails when title is too long', () => {
    const title = 'A'.repeat(65);
    const html = `<html><head><title>${title}</title></head></html>`;
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('too long');
    expect(result.message).toContain('65 chars');
  });

  test('passes exactly at min boundary', () => {
    const title = 'A'.repeat(30);
    const html = `<html><head><title>${title}</title></head></html>`;
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('passes exactly at max boundary', () => {
    const title = 'A'.repeat(60);
    const html = `<html><head><title>${title}</title></head></html>`;
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('fails 1 char below min', () => {
    const title = 'A'.repeat(29);
    const html = `<html><head><title>${title}</title></head></html>`;
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('fails 1 char above max', () => {
    const title = 'A'.repeat(61);
    const html = `<html><head><title>${title}</title></head></html>`;
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('respects custom min/max options', () => {
    const title = 'Short title';  // 11 chars — fails default min(30) but passes custom min(5)
    const html = `<html><head><title>${title}</title></head></html>`;

    const failResult = checkTitleLength(makeInput(html));
    expect(failResult.status).toBe('fail');

    const passResult = checkTitleLength(makeInput(html), { min: 5, max: 20 });
    expect(passResult.status).toBe('pass');
  });

  test('counts multibyte (CJK) characters as 1 each', () => {
    // Each CJK character counts as 1 code point, not bytes
    // 30 chars of Japanese = valid min-length title
    const title = 'これはSEOテストのためのタイトルタグの長さをテストするためのページです';
    const charCount = [...title].length;
    expect(charCount).toBeGreaterThanOrEqual(30);

    const html = `<html><head><title>${title}</title></head></html>`;
    const result = checkTitleLength(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('trims whitespace before measuring length', () => {
    const html = '<html><head><title>   Short   </title></head></html>';
    const result = checkTitleLength(makeInput(html));
    // "Short" is 5 chars — fails default min of 30
    expect(result.status).toBe('fail');
  });

  test('result includes helpUrl', () => {
    const html = '<html><head><title>Test</title></head></html>';
    const result = checkTitleLength(makeInput(html));
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });

  test('result includes duration', () => {
    const html = '<html><head><title>Test title for timing check</title></head></html>';
    const result = checkTitleLength(makeInput(html));
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('result contains the actual title text on failure', () => {
    const html = '<html><head><title>Too Short</title></head></html>';
    const result = checkTitleLength(makeInput(html));
    expect(result.actual).toBe('Too Short');
    expect(result.message).toContain('Too Short');
  });

  test('result url matches input url', () => {
    const html = '<html><head><title>Some long enough title for the test page here now</title></head></html>';
    const url = 'https://example.com/about';
    const result = checkTitleLength({ html, url, context: 'static' });
    expect(result.url).toBe(url);
  });

  test('context is propagated to result', () => {
    const html = '<html><head><title>Some long enough title for the test page here now</title></head></html>';
    const staticResult = checkTitleLength({ html, url: 'https://example.com/', context: 'static' });
    expect(staticResult.context).toBe('static');

    const renderedResult = checkTitleLength({ html, url: 'https://example.com/', context: 'rendered' });
    expect(renderedResult.context).toBe('rendered');
  });
});
