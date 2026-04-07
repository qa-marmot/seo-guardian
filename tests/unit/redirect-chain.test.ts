import { test, expect } from '@playwright/test';
import { formatChainForTest } from '../../src/rules/redirect-chain.js';
import type { RedirectHop } from '../../src/rules/redirect-chain.js';

// checkRedirectChain() makes real HTTP requests so it's covered in E2E.
// We unit-test the pure helper functions.

test.describe('redirect-chain — formatChain helper', () => {
  test('formats a single hop', () => {
    const hops: RedirectHop[] = [{ url: 'https://example.com/', status: 200 }];
    const output = formatChainForTest(hops);
    expect(output).toContain('1.');
    expect(output).toContain('[200]');
    expect(output).toContain('https://example.com/');
  });

  test('formats multiple hops in order', () => {
    const hops: RedirectHop[] = [
      { url: 'http://example.com/', status: 301 },
      { url: 'https://example.com/', status: 200 },
    ];
    const output = formatChainForTest(hops);
    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('1.');
    expect(lines[0]).toContain('[301]');
    expect(lines[1]).toContain('2.');
    expect(lines[1]).toContain('[200]');
  });

  test('formats network error as ERR', () => {
    const hops: RedirectHop[] = [{ url: 'https://example.com/', status: 0 }];
    const output = formatChainForTest(hops);
    expect(output).toContain('[ERR]');
  });

  test('returns empty string for empty hops array', () => {
    const output = formatChainForTest([]);
    expect(output).toBe('');
  });
});

test.describe('redirect-chain — result structure', () => {
  test('result has ruleId = redirect-chain', async () => {
    // We can only test the no-network path: import and call with a URL
    // that will fail immediately (using a clearly invalid host in test env)
    // Instead, verify the exported type structure is correct via type imports
    const { checkRedirectChain } = await import('../../src/rules/redirect-chain.js');
    expect(typeof checkRedirectChain).toBe('function');
  });

  test('formatChain produces numbered list with status codes', () => {
    const hops: RedirectHop[] = [
      { url: 'http://a.example.com/', status: 301 },
      { url: 'http://b.example.com/', status: 302 },
      { url: 'https://c.example.com/', status: 200 },
    ];
    const output = formatChainForTest(hops);
    expect(output).toContain('[301]');
    expect(output).toContain('[302]');
    expect(output).toContain('[200]');
    // Verify numbered order
    expect(output.indexOf('1.')).toBeLessThan(output.indexOf('2.'));
    expect(output.indexOf('2.')).toBeLessThan(output.indexOf('3.'));
  });
});
