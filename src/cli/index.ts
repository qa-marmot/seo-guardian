#!/usr/bin/env node
import type { Browser } from '@playwright/test';
import { cac } from 'cac';
import { createJiti } from 'jiti';
import pc from 'picocolors';
import { resolve } from 'path';
import type { SeoConfig, TestResult } from '../types.js';
import { resolveConfig, resolvePageConfig } from '../config.js';
import { discoverUrls } from '../engine/discovery.js';
import { fetchAndAnalyze } from '../engine/fast-mode.js';
import { runFullMode } from '../engine/full-mode.js';
import { buildSummary } from '../reporter/types.js';
import { printTerminalReport } from '../reporter/terminal.js';
import { writeJsonReport } from '../reporter/json.js';
import { writeJunitReport } from '../reporter/junit.js';

async function loadConfig(configPath: string): Promise<SeoConfig> {
  const absolutePath = resolve(process.cwd(), configPath);
  const jiti = createJiti(__filename);
  return jiti.import<SeoConfig>(absolutePath, { default: true });
}

function executionFailure(url: string, error: unknown): TestResult<string, { reachable: true }> {
  const message = error instanceof Error ? error.message : String(error);

  return {
    ruleId: 'execution',
    status: 'fail',
    severity: 'error',
    actual: message,
    expected: { reachable: true },
    message: `Unable to analyze ${url}: ${message}`,
    context: 'static',
    url,
  };
}

const cli = cac('seo-test');

cli
  .command('[config]', 'Run SEO tests using the specified config file')
  .option('--config <path>', 'Path to seo.config.ts (default: ./seo.config.ts)')
  .option('--reporter <format>', 'Output format: terminal, json, junit (default: terminal)')
  .option('--output <path>', 'Write report to file instead of stdout')
  .option('--base-url <url>', 'Override baseUrl from config')
  .option('--url <url>', 'Test a single URL instead of using discovery')
  .action(async (_, options) => {
    const configPath = options.config ?? options['_'][0] ?? 'seo.config.ts';
    const reporter: string = options.reporter ?? 'terminal';
    const outputPath: string | undefined = options.output;
    const start = Date.now();

    console.log(pc.dim(`Loading config: ${configPath}`));

    let config: SeoConfig;
    try {
      config = await loadConfig(configPath);
    } catch (err) {
      console.error(pc.red(`Failed to load config: ${configPath}`));
      console.error(err);
      process.exit(1);
    }

    if (options['base-url']) {
      config = { ...config, baseUrl: options['base-url'] };
    }

    const resolved = resolveConfig(config);
    let urls: string[];

    if (options.url) {
      urls = [new URL(options.url, config.baseUrl).href];
    } else {
      try {
        console.log(pc.dim('Discovering URLs...'));
        urls = await discoverUrls(config.baseUrl, resolved.discovery);
        console.log(pc.dim(`Found ${urls.length} URL(s) to test`));
      } catch (err) {
        console.error(pc.red('URL discovery failed:'), err);
        process.exit(1);
      }
    }

    const resultsByUrl = new Map<string, TestResult[]>();
    let browser: Browser | undefined;

    try {
      for (const url of urls) {
        console.log(pc.dim(`  Testing ${url}...`));

        try {
          const pageConfig = resolvePageConfig(
            resolved,
            new URL(url, resolved.baseUrl).pathname
          );

          if (pageConfig?.mode === 'full') {
            if (!browser) {
              const { chromium } = await import('@playwright/test');
              browser = await chromium.launch();
            }

            const page = await browser.newPage();
            try {
              const fullModeOptions = pageConfig.waitFor
                ? { waitFor: pageConfig.waitFor }
                : {};
              resultsByUrl.set(
                url,
                await runFullMode(page, url, config, fullModeOptions)
              );
            } finally {
              await page.close();
            }
          } else {
            resultsByUrl.set(url, await fetchAndAnalyze(url, config));
          }
        } catch (err) {
          console.error(pc.red(`  Failed to test ${url}:`), err);
          resultsByUrl.set(url, [executionFailure(url, err)]);
        }
      }
    } finally {
      await browser?.close();
    }

    const summary = buildSummary(resultsByUrl, Date.now() - start);

    switch (reporter) {
      case 'json':
        writeJsonReport(summary, outputPath);
        break;
      case 'junit':
        writeJunitReport(summary, outputPath ?? 'test-results/seo-junit.xml');
        printTerminalReport(summary);
        break;
      default:
        printTerminalReport(summary);
        if (outputPath) {
          writeJsonReport(summary, outputPath);
        }
    }

    // Exit with non-zero code only for error-severity violations.
    if (summary.failed > 0) {
      process.exit(1);
    }
  });

cli.help();
cli.version('0.1.1');
cli.parse();
