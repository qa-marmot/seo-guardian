import type { Page } from '@playwright/test';
import { checkLang } from '../rules/lang.js';

export async function toHaveLangAttribute(
  page: Page
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = checkLang({ html, url, context: 'rendered' });

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
