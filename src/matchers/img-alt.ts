import type { Page } from '@playwright/test';
import { checkImgAlt } from '../rules/img-alt.js';

export async function toHaveValidImgAlts(
  page: Page
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = checkImgAlt({ html, url, context: 'rendered' });

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
