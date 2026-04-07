import type { Expect } from '@playwright/test';

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
    // Matchers are added here and in individual rule files
    // This function is the entry point — see src/matchers/*.ts for implementations
  });
}
