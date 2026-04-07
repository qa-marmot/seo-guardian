import type { TestResult, RuleInput } from '../types.js';

export type RedirectHop = {
  url: string;
  status: number;
};

export type RedirectChainResult = TestResult<
  { hops: RedirectHop[]; finalUrl: string; chainLength: number },
  { maxChainLength: number }
>;

export type RedirectChainOptions = {
  /**
   * Maximum number of redirects allowed before flagging as an issue.
   * Default: 3. Google recommends keeping chains under 3–5 hops.
   */
  maxChainLength?: number;
  /** Request timeout in ms. Default: 10000. */
  timeout?: number;
  userAgent?: string;
};

/**
 * Follows redirect chains manually (fetch with redirect: 'manual') to detect:
 * 1. Chains longer than maxChainLength
 * 2. Redirect loops (cycles)
 * 3. HTTP→HTTPS redirects (informational)
 *
 * Pass: chain length ≤ maxChainLength and no loops
 * Warn: chain is long but within some tolerance; or HTTP→HTTPS redirect present
 * Fail: chain exceeds maxChainLength, or redirect loop detected
 */
export async function checkRedirectChain(
  url: string,
  input: Pick<RuleInput, 'url' | 'context'>,
  options: RedirectChainOptions = {}
): Promise<RedirectChainResult> {
  const start = Date.now();
  const maxChainLength = options.maxChainLength ?? 3;
  const timeout = options.timeout ?? 10000;
  const userAgent = options.userAgent ?? 'seo-guardian/0.1 (redirect checker)';

  const hops: RedirectHop[] = [];
  const visited = new Set<string>();
  let current = url;

  // Follow redirects manually up to maxChainLength + 2 to detect excess
  const hardLimit = maxChainLength + 5;

  while (hops.length <= hardLimit) {
    if (visited.has(current)) {
      // Redirect loop detected
      return {
        ruleId: 'redirect-chain',
        status: 'fail',
        severity: 'warning',
        actual: {
          hops,
          finalUrl: current,
          chainLength: hops.length,
        },
        expected: { maxChainLength },
        message:
          `Redirect loop detected after ${hops.length} hop(s). ` +
          `URL revisited: ${current}\n` +
          formatChain(hops),
        context: input.context,
        url: input.url,
        duration: Date.now() - start,
        helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/301-redirects',
      };
    }

    visited.add(current);

    let response: Response;
    try {
      response = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(timeout),
        headers: { 'User-Agent': userAgent },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      hops.push({ url: current, status: 0 });
      return {
        ruleId: 'redirect-chain',
        status: 'fail',
        severity: 'warning',
        actual: { hops, finalUrl: current, chainLength: hops.length },
        expected: { maxChainLength },
        message: `Network error while following redirect chain at ${current}: ${message}`,
        context: input.context,
        url: input.url,
        duration: Date.now() - start,
        helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/301-redirects',
      };
    }

    hops.push({ url: current, status: response.status });

    // Not a redirect — chain ends here
    if (response.status < 300 || response.status >= 400) {
      break;
    }

    const location = response.headers.get('location');
    if (!location) {
      // Redirect with no Location header — treat as final
      break;
    }

    // Resolve relative Location header
    try {
      current = new URL(location, current).href;
    } catch {
      break;
    }
  }

  const chainLength = hops.filter((h) => h.status >= 300 && h.status < 400).length;
  const finalHop = hops[hops.length - 1];
  const finalUrl = finalHop?.url ?? url;

  // Detect HTTP→HTTPS upgrade
  const hasHttpToHttps =
    url.startsWith('http://') &&
    finalUrl.startsWith('https://');

  if (chainLength > maxChainLength) {
    return {
      ruleId: 'redirect-chain',
      status: 'fail',
      severity: 'warning',
      actual: { hops, finalUrl, chainLength },
      expected: { maxChainLength },
      message:
        `Redirect chain too long: ${chainLength} redirect(s) (max: ${maxChainLength}).\n` +
        formatChain(hops),
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/301-redirects',
    };
  }

  if (chainLength > 0 && hasHttpToHttps) {
    return {
      ruleId: 'redirect-chain',
      status: 'warn',
      severity: 'warning',
      actual: { hops, finalUrl, chainLength },
      expected: { maxChainLength },
      message:
        `HTTP→HTTPS redirect detected (${chainLength} hop(s)). ` +
        `Consider serving HTTPS directly.\n` +
        formatChain(hops),
      context: input.context,
      url: input.url,
      duration: Date.now() - start,
      helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/301-redirects',
    };
  }

  return {
    ruleId: 'redirect-chain',
    status: 'pass',
    severity: 'warning',
    actual: { hops, finalUrl, chainLength },
    expected: { maxChainLength },
    message:
      chainLength === 0
        ? `No redirects for ${url} — final status: ${finalHop?.status ?? 'unknown'}`
        : `Redirect chain OK: ${chainLength} hop(s) ≤ max ${maxChainLength}.\n` + formatChain(hops),
    context: input.context,
    url: input.url,
    duration: Date.now() - start,
    helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/301-redirects',
  };
}

function formatChain(hops: RedirectHop[]): string {
  return hops
    .map((h, i) => `  ${i + 1}. [${h.status === 0 ? 'ERR' : h.status}] ${h.url}`)
    .join('\n');
}

// Exported for unit testing
export { formatChain as formatChainForTest };
