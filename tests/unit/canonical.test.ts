import { test, expect } from '@playwright/test';
import { checkCanonical } from '../../src/rules/canonical.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string, url = 'https://example.com/'): RuleInput {
  return { html, url, context: 'static' };
}

test.describe('canonical rule', () => {
  test('passes when canonical link exists with valid href', () => {
    const html = '<html><head><link rel="canonical" href="https://example.com/"></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toBe('https://example.com/');
  });

  test('fails when canonical link is missing', () => {
    const html = '<html><head></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.actual).toBeNull();
    expect(result.message).toContain('missing');
  });

  test('fails when canonical href is empty', () => {
    const html = '<html><head><link rel="canonical" href=""></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('empty');
  });

  test('fails when canonical href is only whitespace', () => {
    const html = '<html><head><link rel="canonical" href="   "></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('empty');
  });

  test('passes with expectedUrl that matches', () => {
    const html = '<html><head><link rel="canonical" href="https://example.com/page"></head></html>';
    const result = checkCanonical(
      makeInput(html),
      { expectedUrl: 'https://example.com/page' }
    );
    expect(result.status).toBe('pass');
  });

  test('fails when expectedUrl does not match actual href', () => {
    const html = '<html><head><link rel="canonical" href="https://example.com/page"></head></html>';
    const result = checkCanonical(
      makeInput(html),
      { expectedUrl: 'https://example.com/other' }
    );
    expect(result.status).toBe('fail');
    expect(result.message).toContain('mismatch');
    expect(result.message).toContain('https://example.com/page');
    expect(result.message).toContain('https://example.com/other');
  });

  test('passes without expectedUrl regardless of href value', () => {
    const html = '<html><head><link rel="canonical" href="https://other.com/canonical"></head></html>';
    const result = checkCanonical(makeInput(html));
    // No expectedUrl — just checks presence
    expect(result.status).toBe('pass');
  });

  test('selector points to canonical link element', () => {
    const html = '<html><head></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.selector).toBe('link[rel="canonical"]');
  });

  test('result includes helpUrl', () => {
    const html = '<html><head></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });

  test('actual is the trimmed href value', () => {
    const html = '<html><head><link rel="canonical" href="  https://example.com/  "></head></html>';
    const result = checkCanonical(makeInput(html));
    expect(result.actual).toBe('https://example.com/');
  });
});
