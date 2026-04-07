import type { Expect, Page } from '@playwright/test';
import { toHaveSeoTitle } from './title-length.js';
import { toHaveSeoDescription } from './description-length.js';
import { toHaveSingleH1 } from './h1-single.js';
import { toHaveLangAttribute } from './lang.js';
import { toHaveCanonical } from './canonical.js';
import { toHaveNoNoindex } from './noindex.js';
import { toHaveRequiredOgTags } from './og-required.js';
import { toHaveValidImgAlts } from './img-alt.js';
import { toHaveValidStructuredData } from './structured-data.js';
import { toHaveNoInternalBrokenLinks } from './broken-links.js';
import type { LinkCheckOptions } from '../rules/broken-links.js';

export type { LinkCheckOptions };

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
      toHaveNoInternalBrokenLinks(options?: LinkCheckOptions): Promise<R>;
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
    async toHaveSeoDescription(page: Page, options?: SeoDescriptionOptions) {
      return toHaveSeoDescription(page, options);
    },
    async toHaveSingleH1(page: Page) {
      return toHaveSingleH1(page);
    },
    async toHaveLangAttribute(page: Page) {
      return toHaveLangAttribute(page);
    },
    async toHaveCanonical(page: Page, url?: string) {
      return toHaveCanonical(page, url);
    },
    async toHaveNoNoindex(page: Page) {
      return toHaveNoNoindex(page);
    },
    async toHaveRequiredOgTags(page: Page, options?: SeoOgTagsOptions) {
      return toHaveRequiredOgTags(page, options);
    },
    async toHaveValidImgAlts(page: Page) {
      return toHaveValidImgAlts(page);
    },
    async toHaveValidStructuredData(page: Page, options?: SeoStructuredDataOptions) {
      return toHaveValidStructuredData(page, options);
    },
    async toHaveNoInternalBrokenLinks(page: Page, options?: LinkCheckOptions) {
      return toHaveNoInternalBrokenLinks(page, options);
    },
  });
}
