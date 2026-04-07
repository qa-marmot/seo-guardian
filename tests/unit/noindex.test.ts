import { test, expect } from '@playwright/test';
import { checkNoindex } from '../../src/rules/noindex.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string, responseHeaders?: Record<string, string>): RuleInput {
  return { html, url: 'https://example.com/', context: 'static', responseHeaders };
}

test.describe('noindex rule', () => {
  test('passes when no robots meta tag exists', () => {
    const html = '<html><head></head><body></body></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toBe(false);
  });

  test('passes when robots meta is "index,follow"', () => {
    const html = '<html><head><meta name="robots" content="index,follow"></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('pass');
  });

  test('fails when robots meta contains "noindex"', () => {
    const html = '<html><head><meta name="robots" content="noindex"></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.actual).toBe(true);
    expect(result.message).toContain('noindex');
  });

  test('fails when robots meta is "noindex,nofollow"', () => {
    const html = '<html><head><meta name="robots" content="noindex,nofollow"></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('fails when robots meta is "noindex, follow" (with space)', () => {
    const html = '<html><head><meta name="robots" content="noindex, follow"></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('fails case-insensitively (NOINDEX)', () => {
    const html = '<html><head><meta name="robots" content="NOINDEX"></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('fail');
  });

  test('fails when googlebot meta contains noindex', () => {
    const html = '<html><head><meta name="googlebot" content="noindex"></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('googlebot');
  });

  test('fails when X-Robots-Tag header contains noindex', () => {
    const html = '<html><head></head></html>';
    const result = checkNoindex(makeInput(html, { 'x-robots-tag': 'noindex' }));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('X-Robots-Tag');
  });

  test('passes when X-Robots-Tag header is "index"', () => {
    const html = '<html><head></head></html>';
    const result = checkNoindex(makeInput(html, { 'x-robots-tag': 'index' }));
    expect(result.status).toBe('pass');
  });

  test('passes when noindex is part of a longer word (not a match)', () => {
    // "noindex-preview" should NOT match the "noindex" token
    const html = '<html><head><meta name="robots" content="noindex-preview"></head></html>';
    const result = checkNoindex(makeInput(html));
    // "noindex-preview" split by comma and trimmed is "noindex-preview", not "noindex"
    expect(result.status).toBe('pass');
  });

  test('expected is always { noindex: false }', () => {
    const html = '<html><head></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.expected).toEqual({ noindex: false });
  });

  test('result includes helpUrl', () => {
    const html = '<html><head></head></html>';
    const result = checkNoindex(makeInput(html));
    expect(result.helpUrl).toBeTruthy();
  });
});
