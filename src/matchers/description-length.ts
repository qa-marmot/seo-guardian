import type { Page } from '@playwright/test';
import { checkDescriptionLength } from '../rules/description-length.js';
import type { SeoDescriptionOptions } from './index.js';

export async function toHaveSeoDescription(
  page: Page,
  options: SeoDescriptionOptions = {}
): Promise<{ pass: boolean; message: () => string }> {
  const url = page.url();
  const html = await page.content();

  const opts: { min?: number; max?: number } = {};
  if (options.minLength !== undefined) opts.min = options.minLength;
  if (options.maxLength !== undefined) opts.max = options.maxLength;

  const result = checkDescriptionLength({ html, url, context: 'rendered' }, opts);

  const pass = result.status === 'pass';

  return {
    pass,
    message: () => result.message,
  };
}
