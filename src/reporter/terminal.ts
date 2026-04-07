import pc from 'picocolors';
import type { ReportSummary } from './types.js';
import type { TestResult } from '../types.js';

const ICONS = {
  pass: pc.green('✓'),
  fail: pc.red('✗'),
  warn: pc.yellow('⚠'),
} as const;

function statusColor(status: TestResult['status']): string {
  switch (status) {
    case 'pass': return pc.green(status.toUpperCase());
    case 'fail': return pc.red(status.toUpperCase());
    case 'warn': return pc.yellow(status.toUpperCase());
  }
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return '';
  return pc.dim(` (${ms}ms)`);
}

/**
 * Print a human-readable terminal report with color-coded results.
 */
export function printTerminalReport(summary: ReportSummary): void {
  const { byUrl, total, passed, failed, warned, duration } = summary;

  console.log('');
  console.log(pc.bold('SEO Guardian — Test Results'));
  console.log(pc.dim('─'.repeat(60)));

  for (const [url, results] of byUrl) {
    console.log('');
    console.log(pc.bold(pc.cyan(`  ${url}`)));

    for (const result of results) {
      const icon = ICONS[result.status];
      const ruleId = pc.dim(`[${result.ruleId}]`);
      const duration = formatDuration(result.duration);

      console.log(`    ${icon} ${ruleId} ${result.message}${duration}`);

      if (result.status === 'fail' && result.helpUrl) {
        console.log(`       ${pc.dim('→')} ${pc.dim(result.helpUrl)}`);
      }
    }
  }

  console.log('');
  console.log(pc.dim('─'.repeat(60)));
  console.log(
    `  ${pc.bold('Results:')} ` +
    `${pc.green(`${passed} passed`)}` +
    (failed > 0 ? `, ${pc.red(`${failed} failed`)}` : '') +
    (warned > 0 ? `, ${pc.yellow(`${warned} warned`)}` : '') +
    ` of ${total} checks` +
    pc.dim(` in ${(duration / 1000).toFixed(2)}s`)
  );
  console.log('');

  if (failed > 0) {
    console.log(pc.red(pc.bold(`  FAIL — ${failed} error(s) must be fixed before deployment.`)));
  } else if (warned > 0) {
    console.log(pc.yellow(pc.bold(`  WARN — All errors passed but ${warned} warning(s) found.`)));
  } else {
    console.log(pc.green(pc.bold('  PASS — All SEO checks passed.')));
  }
  console.log('');
}
