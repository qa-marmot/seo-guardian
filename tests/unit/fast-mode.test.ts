import { expect, test } from '@playwright/test';
import { fetchAndAnalyze, runFastMode } from '../../src/engine/fast-mode.js';
import { buildSummary } from '../../src/reporter/types.js';
import type { SeoConfig, TestResult } from '../../src/types.js';

const url = 'https://example.test/page';

const allRulesOff: NonNullable<SeoConfig['rules']> = {
  'title-length': 'off',
  'description-length': 'off',
  'img-alt': 'off',
  'canonical': 'off',
  'noindex': 'off',
  'og-required': 'off',
  'hreflang': 'off',
  'robots-txt': 'off',
  'x-robots-tag': 'off',
  'broken-links': 'off',
  'structured-data': 'off',
  'h1-single': 'off',
  'lang': 'off',
  'redirect-chain': 'off',
};

function config(rules: SeoConfig['rules']): SeoConfig {
  return { baseUrl: 'https://example.test', rules };
}

test.describe('Fast Mode configuration integration', () => {
  test('applies configured severity to every rule and supports canonical expectedUrl', async () => {
    const results = await runFastMode(
      '<html><head><link rel="canonical" href="https://example.test/wrong"></head><body></body></html>',
      url,
      config({
        ...allRulesOff,
        'h1-single': 'warning',
        'canonical': {
          expectedUrl: url,
          severity: 'warning',
        },
      })
    );

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'h1-single',
        status: 'warn',
        severity: 'warning',
      }),
      expect.objectContaining({
        ruleId: 'canonical',
        status: 'warn',
        severity: 'warning',
      }),
    ]));
  });

  test('promotes a rule violation to a deployment-blocking failure when configured as error', async () => {
    const results = await runFastMode(
      '<html><head></head><body></body></html>',
      url,
      config({
        ...allRulesOff,
        'structured-data': { required: ['Article'], severity: 'error' },
      })
    );

    expect(results).toEqual([
      expect.objectContaining({
        ruleId: 'structured-data',
        status: 'fail',
        severity: 'error',
      }),
    ]);
  });

  test('registers robots.txt and redirect-chain rules declared in configuration', async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: string | URL | Request) => {
      const requestedUrl = input instanceof Request ? input.url : input.toString();
      requestedUrls.push(requestedUrl);

      if (requestedUrl.endsWith('/robots.txt')) {
        return new Response('User-agent: *\nSitemap: https://example.test/sitemap.xml', {
          status: 200,
        });
      }

      return new Response('', { status: 200 });
    }) as typeof fetch;

    try {
      const results = await runFastMode(
        '<html><head></head><body></body></html>',
        url,
        config({
          ...allRulesOff,
          'robots-txt': 'warning',
          'redirect-chain': 'warning',
        })
      );

      expect(results.map((result) => result.ruleId)).toEqual([
        'robots-txt',
        'redirect-chain',
      ]);
      expect(requestedUrls).toEqual(expect.arrayContaining([
        'https://example.test/robots.txt',
        url,
      ]));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('counts non-error failures as warnings so they cannot fail the CLI', () => {
    const warningFailure: TestResult = {
      ruleId: 'canonical',
      status: 'fail',
      severity: 'warning',
      actual: null,
      expected: { self: url },
      message: 'Canonical link is missing.',
      context: 'static',
      url,
    };

    const summary = buildSummary(new Map([[url, [warningFailure]]]), 0);

    expect(summary).toMatchObject({ failed: 0, warned: 1, passed: 0, total: 1 });
  });

  test('does not treat an unsuccessful document response as a successful analysis', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('Not Found', {
      status: 404,
      statusText: 'Not Found',
    })) as typeof fetch;

    try {
      await expect(fetchAndAnalyze(url, config(allRulesOff))).rejects.toThrow('HTTP 404 Not Found');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
