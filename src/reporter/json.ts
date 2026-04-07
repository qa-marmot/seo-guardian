import { writeFileSync } from 'fs';
import type { ReportSummary } from './types.js';

export type JsonReport = {
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    duration: number;
    urls: string[];
  };
  results: {
    url: string;
    checks: unknown[];
  }[];
};

/**
 * Build a JSON report object from a ReportSummary.
 */
export function buildJsonReport(summary: ReportSummary): JsonReport {
  return {
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      warned: summary.warned,
      duration: summary.duration,
      urls: summary.urls,
    },
    results: [...summary.byUrl.entries()].map(([url, results]) => ({
      url,
      checks: results,
    })),
  };
}

/**
 * Write a JSON report to a file or print to stdout.
 */
export function writeJsonReport(summary: ReportSummary, outputPath?: string): void {
  const report = buildJsonReport(summary);
  const json = JSON.stringify(report, null, 2);

  if (outputPath) {
    writeFileSync(outputPath, json, 'utf-8');
  } else {
    console.log(json);
  }
}
