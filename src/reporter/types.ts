import type { TestResult } from '../types.js';

export type ReportSummary = {
  total: number;
  passed: number;
  failed: number;
  warned: number;
  /** URLs that were tested */
  urls: string[];
  /** Results grouped by URL */
  byUrl: Map<string, TestResult[]>;
  /** Duration in ms */
  duration: number;
};

export type ReporterFormat = 'terminal' | 'json' | 'junit';

export function buildSummary(
  results: Map<string, TestResult[]>,
  duration: number
): ReportSummary {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let warned = 0;

  for (const pageResults of results.values()) {
    for (const r of pageResults) {
      total++;
      if (r.status === 'pass') passed++;
      else if (r.status === 'fail') failed++;
      else if (r.status === 'warn') warned++;
    }
  }

  return {
    total,
    passed,
    failed,
    warned,
    urls: [...results.keys()],
    byUrl: results,
    duration,
  };
}
