import type { Page } from '@playwright/test';
import { checkStructuredData } from '../rules/structured-data.js';
import type { SeoStructuredDataOptions } from './index.js';

export async function toHaveValidStructuredData(
  page: Page,
  options: SeoStructuredDataOptions = {}
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const required: string[] = options.type
    ? [options.type, ...(options.required ?? [])]
    : (options.required ?? []);

  const result = checkStructuredData(
    { html, url, context: 'rendered' },
    { required }
  );

  // warn counts as pass for expect() — use expect.soft() to surface warnings
  const pass = result.status !== 'fail';

  return {
    pass,
    message: () => result.message,
  };
}
