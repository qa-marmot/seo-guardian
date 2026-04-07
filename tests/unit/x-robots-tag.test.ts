import { test, expect } from '@playwright/test';
import { checkXRobotsTag } from '../../src/rules/x-robots-tag.js';
import type { RuleInput } from '../../src/types.js';

function makeInput(headers?: Record<string, string>): RuleInput {
  return {
    html: '<html><head></head></html>',
    url: 'https://example.com/',
    context: 'static',
    ...(headers ? { responseHeaders: headers } : {}),
  };
}

test.describe('x-robots-tag rule', () => {
  test('passes when no responseHeaders provided', () => {
    const result = checkXRobotsTag(makeInput());
    expect(result.status).toBe('pass');
    expect(result.actual.headerValue).toBeNull();
  });

  test('passes when responseHeaders has no X-Robots-Tag', () => {
    const result = checkXRobotsTag(makeInput({ 'content-type': 'text/html' }));
    expect(result.status).toBe('pass');
    expect(result.actual.headerValue).toBeNull();
  });

  test('passes when X-Robots-Tag is "index, follow"', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'index, follow' }));
    expect(result.status).toBe('pass');
  });

  test('fails when X-Robots-Tag contains noindex', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'noindex' }));
    expect(result.status).toBe('fail');
    expect(result.message).toContain('noindex');
  });

  test('fails when X-Robots-Tag is "noindex, nofollow"', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'noindex, nofollow' }));
    expect(result.status).toBe('fail');
  });

  test('fails case-insensitively (NOINDEX)', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'NOINDEX' }));
    expect(result.status).toBe('fail');
  });

  test('warns when X-Robots-Tag contains nosnippet', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'nosnippet' }));
    expect(result.status).toBe('warn');
    expect(result.message).toContain('nosnippet');
  });

  test('warns when X-Robots-Tag contains unavailable_after', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'unavailable_after: 2025-01-01' }));
    expect(result.status).toBe('warn');
  });

  test('warns when X-Robots-Tag is "none"', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'none' }));
    expect(result.status).toBe('warn');
  });

  test('handles uppercase header name (X-Robots-Tag)', () => {
    const result = checkXRobotsTag(makeInput({ 'X-Robots-Tag': 'noindex' }));
    expect(result.status).toBe('fail');
  });

  test('actual.directives contains parsed directives', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'noindex, nofollow' }));
    expect(result.actual.directives).toContain('noindex');
    expect(result.actual.directives).toContain('nofollow');
  });

  test('actual.headerValue contains original header string', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'noindex, nofollow' }));
    expect(result.actual.headerValue).toBe('noindex, nofollow');
  });

  test('severity is always warning', () => {
    const result = checkXRobotsTag(makeInput({ 'x-robots-tag': 'noindex' }));
    expect(result.severity).toBe('warning');
  });

  test('result includes helpUrl', () => {
    const result = checkXRobotsTag(makeInput());
    expect(result.helpUrl).toBeTruthy();
    expect(result.helpUrl).toContain('google.com');
  });
});
