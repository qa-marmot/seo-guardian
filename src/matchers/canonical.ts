import type { Page } from '@playwright/test';
import { checkCanonical } from '../rules/canonical.js';

export async function toHaveCanonical(
  page: Page,
  expectedUrl?: string
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = checkCanonical(
    { html, url, context: 'rendered' },
    expectedUrl ? { expectedUrl } : {}
  );

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
