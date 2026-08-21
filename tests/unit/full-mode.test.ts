import { expect, test, type Page } from '@playwright/test';
import { runFullMode } from '../../src/engine/full-mode.js';
import type { SeoConfig } from '../../src/types.js';

const config: SeoConfig = {
  baseUrl: 'https://example.test',
  rules: {
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
  },
};

test('Full Mode rejects a non-success document response instead of analyzing it as a pass', async () => {
  const page = {
    goto: async () => ({
      ok: () => false,
      status: () => 404,
      statusText: () => 'Not Found',
    }),
  };

  await expect(
    runFullMode(page as unknown as Page, 'https://example.test/missing', config)
  ).rejects.toThrow('HTTP 404 Not Found');
});

