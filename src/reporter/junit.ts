import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ReportSummary } from './types.js';
import type { TestResult } from '../types.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resultToTestCase(result: TestResult, url: string): string {
  const name = escapeXml(`[${result.ruleId}] ${url}`);
  const classname = escapeXml(result.ruleId);
  const time = ((result.duration ?? 0) / 1000).toFixed(3);

  if (result.status === 'fail') {
    const message = escapeXml(result.message);
    const details = escapeXml(
      [
        `URL: ${url}`,
        `Rule: ${result.ruleId}`,
        `Severity: ${result.severity}`,
        result.selector ? `Selector: ${result.selector}` : '',
        result.helpUrl ? `Help: ${result.helpUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
    return `    <testcase name="${name}" classname="${classname}" time="${time}">
      <failure message="${message}">${details}</failure>
    </testcase>`;
  }

  if (result.status === 'warn') {
    const message = escapeXml(result.message);
    return `    <testcase name="${name}" classname="${classname}" time="${time}">
      <system-out>${message}</system-out>
    </testcase>`;
  }

  return `    <testcase name="${name}" classname="${classname}" time="${time}"/>`;
}

/**
 * Build a JUnit XML string from a ReportSummary.
 * Compatible with GitHub Actions, Jenkins, and most CI systems.
 */
export function buildJunitXml(summary: ReportSummary): string {
  const totalTime = (summary.duration / 1000).toFixed(3);
  const testCases: string[] = [];

  for (const [url, results] of summary.byUrl) {
    for (const result of results) {
      testCases.push(resultToTestCase(result, url));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="seo-guardian" tests="${summary.total}" failures="${summary.failed}" errors="0" time="${totalTime}">
  <testsuite name="SEO Checks" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.warned}" time="${totalTime}">
${testCases.join('\n')}
  </testsuite>
</testsuites>
`;
}

/**
 * Write a JUnit XML report to a file or print to stdout.
 */
export function writeJunitReport(summary: ReportSummary, outputPath?: string): void {
  const xml = buildJunitXml(summary);

  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, xml, 'utf-8');
  } else {
    console.log(xml);
  }
}
