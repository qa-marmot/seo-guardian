#!/usr/bin/env node
import { cac } from 'cac';
import pc from 'picocolors';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { SeoConfig, TestResult } from '../types.js';
import { resolveConfig } from '../config.js';
import { discoverUrls } from '../engine/discovery.js';
import { fetchAndAnalyze } from '../engine/fast-mode.js';
import { buildSummary } from '../reporter/types.js';
import { printTerminalReport } from '../reporter/terminal.js';
import { writeJsonReport } from '../reporter/json.js';
import { writeJunitReport } from '../reporter/junit.js';

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
      const absolutePath = resolve(process.cwd(), configPath);
      const fileUrl = pathToFileURL(absolutePath).href;
      const mod = await import(fileUrl) as { default?: SeoConfig };
      config = mod.default ?? (mod as unknown as SeoConfig);
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
      urls = [options.url];
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

    for (const url of urls) {
      console.log(pc.dim(`  Testing ${url}...`));
      try {
        const results = await fetchAndAnalyze(url, config);
        resultsByUrl.set(url, results);
      } catch (err) {
        console.error(pc.red(`  Failed to test ${url}:`), err);
        resultsByUrl.set(url, []);
      }
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

    // Exit with non-zero code if any errors found
    if (summary.failed > 0) {
      process.exit(1);
    }
  });

cli.help();
cli.version('0.1.0');
cli.parse();
