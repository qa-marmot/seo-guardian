import type { Expect, Page } from '@playwright/test';
import { toHaveSeoTitle } from './title-length.js';

// Matcher option types
export type SeoTitleOptions = {
  minLength?: number;
  maxLength?: number;
};

export type SeoDescriptionOptions = {
  minLength?: number;
  maxLength?: number;
};

export type SeoStructuredDataOptions = {
  type?: string;
  required?: string[];
};

export type SeoOgTagsOptions = {
  tags?: string[];
};

// Augment Playwright's Matchers interface for full TypeScript support
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    interface Matchers<R> {
      toHaveSeoTitle(options?: SeoTitleOptions): Promise<R>;
      toHaveSeoDescription(options?: SeoDescriptionOptions): Promise<R>;
      toHaveSingleH1(): Promise<R>;
      toHaveCanonical(url?: string): Promise<R>;
      toHaveNoNoindex(): Promise<R>;
      toHaveLangAttribute(): Promise<R>;
      toHaveRequiredOgTags(options?: SeoOgTagsOptions): Promise<R>;
      toHaveValidImgAlts(): Promise<R>;
      toHaveValidStructuredData(options?: SeoStructuredDataOptions): Promise<R>;
    }
  }
}

/**
 * Extend Playwright's expect with SEO-specific matchers.
 * Call this once in your test setup file.
 *
 * @example
 * import { expect } from '@playwright/test';
 * import { extendExpect } from '@seo-guardian/core';
 * extendExpect(expect);
 */
export function extendExpect(expect: Expect): void {
  expect.extend({
    async toHaveSeoTitle(page: Page, options?: SeoTitleOptions) {
      return toHaveSeoTitle(page, options);
    },
  });
}
