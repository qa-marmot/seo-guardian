import { test, expect } from '@playwright/test';
import { checkLang } from '../../src/rules/lang.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(html: string): RuleInput {
  return { html, url: 'https://example.com/', context: 'static' };
}

test.describe('lang rule', () => {
  test('passes when html has a valid lang attribute', () => {
    const html = '<html lang="en"><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toBe('en');
  });

  test('passes with locale-specific lang code', () => {
    const html = '<html lang="en-US"><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toBe('en-US');
  });

  test('passes with Japanese lang code', () => {
    const html = '<html lang="ja"><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.status).toBe('pass');
    expect(result.actual).toBe('ja');
  });

  test('fails when lang attribute is missing', () => {
    const html = '<html><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.actual).toBeNull();
    expect(result.message).toContain('missing');
  });

  test('fails when lang attribute is empty string', () => {
    const html = '<html lang=""><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.actual).toBe('');
    expect(result.message).toContain('empty');
  });

  test('fails when lang attribute is only whitespace', () => {
    const html = '<html lang="   "><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('empty');
  });

  test('selector points to html element', () => {
    const html = '<html><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.selector).toBe('html');
  });

  test('result includes helpUrl', () => {
    const html = '<html><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.helpUrl).toBeTruthy();
  });

  test('expected is { present: true }', () => {
    const html = '<html lang="en"><head></head><body></body></html>';
    const result = checkLang(makeInput(html));
    expect(result.expected).toEqual({ present: true });
  });
});
