import type { Page } from '@playwright/test';
import { checkTitleLength } from '../rules/title-length.js';
import type { SeoTitleOptions } from './index.js';

export async function toHaveSeoTitle(
  page: Page,
  options: SeoTitleOptions = {}
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const opts: { min?: number; max?: number } = {};
  if (options.minLength !== undefined) opts.min = options.minLength;
  if (options.maxLength !== undefined) opts.max = options.maxLength;

  const result = checkTitleLength({ html, url, context: 'rendered' }, opts);

  const pass = result.status === 'pass';

  return {
    pass,
    message: () => result.message,
  };
}
