import type { Browser, Page } from '@playwright/test';
import type { TestResult, SeoConfig, WaitForStrategy } from '../types.js';
import { runFastMode } from './fast-mode.js';

/**
 * Apply a waitFor strategy before extracting page content.
 */
async function applyWaitFor(page: Page, waitFor: WaitForStrategy): Promise<void> {
  switch (waitFor.type) {
    case 'selector':
      await page.waitForSelector(waitFor.selector, { state: 'attached' });
      break;
    case 'title':
      await page.waitForFunction(
        (value: string | RegExp) => {
          const title = document.title;
          if (value instanceof RegExp) return value.test(title);
          return title === value;
        },
        waitFor.value
      );
      break;
    case 'networkidle':
      await page.waitForLoadState('networkidle');
      break;
    case 'load':
      await page.waitForLoadState('load');
      break;
  }
}

export type FullModeOptions = {
  waitFor?: WaitForStrategy;
  timeout?: number;
};

/**
 * Full Mode engine: navigates to the URL with Playwright, waits for hydration,
 * then extracts the rendered DOM and runs all rules.
 */
export async function runFullMode(
  page: Page,
  url: string,
  config: SeoConfig,
  options: FullModeOptions = {}
): Promise<TestResult[]> {
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: options.timeout ?? 30000,
  });

  if (options.waitFor) {
    await applyWaitFor(page, options.waitFor);
  }

  const html = await page.content();

  // Capture response headers via route interception is complex in this context;
  // we run fast mode rules on the rendered HTML instead
  return runFastMode(html, url, config, undefined);
}

/**
 * Run Full Mode across multiple URLs using a shared browser instance.
 */
export async function runFullModeAll(
  browser: Browser,
  urls: string[],
  config: SeoConfig,
  options: FullModeOptions = {}
): Promise<Map<string, TestResult[]>> {
  const results = new Map<string, TestResult[]>();

  for (const url of urls) {
    const page = await browser.newPage();
    try {
      const pageResults = await runFullMode(page, url, config, options);
      results.set(url, pageResults);
    } finally {
      await page.close();
    }
  }

  return results;
}
