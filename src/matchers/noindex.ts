import type { Page } from '@playwright/test';
import { checkNoindex } from '../rules/noindex.js';

export async function toHaveNoNoindex(
  page: Page
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = checkNoindex({ html, url, context: 'rendered' });

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
