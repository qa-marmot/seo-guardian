import type { Page } from '@playwright/test';
import { checkH1Single } from '../rules/h1-single.js';

export async function toHaveSingleH1(
  page: Page
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = checkH1Single({ html, url, context: 'rendered' });

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
