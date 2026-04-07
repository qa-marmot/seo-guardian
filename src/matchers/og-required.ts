import type { Page } from '@playwright/test';
import { checkOgRequired } from '../rules/og-required.js';
import type { SeoOgTagsOptions } from './index.js';

export async function toHaveRequiredOgTags(
  page: Page,
  options: SeoOgTagsOptions = {}
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const result = checkOgRequired(
    { html, url, context: 'rendered' },
    options.tags ? { tags: options.tags } : {}
  );

  return {
    pass: result.status === 'pass',
    message: () => result.message,
  };
}
