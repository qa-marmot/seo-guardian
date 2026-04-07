import type { Page } from '@playwright/test';
import { checkBrokenLinks } from '../rules/broken-links.js';
import type { LinkCheckOptions } from '../rules/broken-links.js';

export async function toHaveNoInternalBrokenLinks(
  page: Page,
  options: LinkCheckOptions = {}
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = await checkBrokenLinks(
    { html, url, context: 'rendered' },
    { scope: 'internal', ...options }
  );

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
