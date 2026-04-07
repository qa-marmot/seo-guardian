import type { TestResult, RuleInput } from '../types.js';

export type RobotsTxtEntry = {
  userAgent: string;
  directives: { directive: string; value: string }[];
};

export type RobotsTxtResult = TestResult<
  { exists: boolean; content?: string; issues: string[] },
  { exists: true; noUnintendedBlocks: true }
>;

/**
 * Fetches and validates robots.txt.
 *
 * Checks:
 * 1. robots.txt exists and returns 200
 * 2. No "Disallow: /" for all user agents in production
 * 3. Sitemap directive is present (warning only)
 *
 * Note: This rule requires network access — always runs in 'static' context
 * using fetch, not via cheerio HTML parsing.
 */
export async function checkRobotsTxt(
  baseUrl: string,
  input: Pick<RuleInput, 'url' | 'context'>
): Promise<RobotsTxtResult> {
  const start = Date.now();
  const robotsUrl = new URL('/robots.txt', baseUrl).href;
  const issues: string[] = [];

  let content: string;

  try {
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': 'seo-guardian/0.1' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        ruleId: 'robots-txt',
        status: 'fail',
        severity: 'warning',
        actual: { exists: false, issues: [`robots.txt returned HTTP ${response.status}`] },
        expected: { exists: true, noUnintendedBlocks: true },
        message: `robots.txt not found at ${robotsUrl} (HTTP ${response.status})`,
        context: input.context,
        url: input.url,
        duration: Date.now() - start,
        helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt',
      };
    }

    content = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ruleId: 'robots-txt',
      status: 'fail',
      severity: 'warning',
      actual: { exists: false, issues: [`Failed to fetch robots.txt: ${message}`] },
      expected: { exists: true, noUnintendedBlocks: true },
      message: `Could not fetch robots.txt at ${robotsUrl}: ${message}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt',
    };
  }

  // Parse and validate
  const parsed = parseRobotsTxt(content);
  const blockedAgents = findUnintendedBlocks(parsed);
  issues.push(...blockedAgents);

  if (!hasSitemapDirective(content)) {
    issues.push('No Sitemap: directive found in robots.txt (recommended)');
  }

  if (issues.length === 0) {
    return {
      ruleId: 'robots-txt',
      status: 'pass',
      severity: 'warning',
      actual: { exists: true, content, issues: [] },
      expected: { exists: true, noUnintendedBlocks: true },
      message: `robots.txt found and valid at ${robotsUrl}`,
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt',
    };
  }

  // Distinguish critical blocks (Disallow: /) from advisory issues
  const hasCriticalBlock = blockedAgents.length > 0;
  const issueList = issues.map((i) => `  - ${i}`).join('\n');

  return {
    ruleId: 'robots-txt',
    status: hasCriticalBlock ? 'fail' : 'warn',
    severity: 'warning',
    actual: { exists: true, content, issues },
    expected: { exists: true, noUnintendedBlocks: true },
    message: `robots.txt issues found:\n${issueList}`,
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt',
  };
}

// Exported for unit testing
export const parseRobotsTxtForTest = parseRobotsTxt;
export const findUnintendedBlocksForTest = findUnintendedBlocks;
export const hasSitemapDirectiveForTest = hasSitemapDirective;

function parseRobotsTxt(content: string): RobotsTxtEntry[] {
  const entries: RobotsTxtEntry[] = [];
  let current: RobotsTxtEntry | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === 'user-agent') {
      current = { userAgent: value, directives: [] };
      entries.push(current);
    } else if (current) {
      current.directives.push({ directive, value });
    }
  }

  return entries;
}

function findUnintendedBlocks(entries: RobotsTxtEntry[]): string[] {
  const issues: string[] = [];

  for (const entry of entries) {
    const isAll = entry.userAgent === '*';
    const hasDisallowAll = entry.directives.some(
      (d) => d.directive === 'disallow' && d.value === '/'
    );

    if (hasDisallowAll) {
      const agent = isAll ? 'all crawlers (User-agent: *)' : `"${entry.userAgent}"`;
      issues.push(
        `robots.txt disallows ${agent} from crawling the entire site (Disallow: /). ` +
        'This will block all search engine indexing.'
      );
    }
  }

  return issues;
}

function hasSitemapDirective(content: string): boolean {
  return /^Sitemap:/im.test(content);
}
