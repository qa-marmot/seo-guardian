import type { PageConfig, SeoConfig } from './types.js';

/**
 * Define and validate an SEO test configuration.
 * This is a typed identity function that provides IDE autocompletion.
 */
export function defineSeoConfig(config: SeoConfig): SeoConfig {
  return config;
}

const DEFAULT_RULES: SeoConfig['rules'] = {
  'title-length': { min: 30, max: 60, severity: 'error' },
  'description-length': { min: 70, max: 160, severity: 'error' },
  'img-alt': 'error',
  'canonical': 'error',
  'noindex': 'error',
  'og-required': 'error',
  'hreflang': 'off',
  'robots-txt': 'warning',
  'x-robots-tag': 'warning',
  'broken-links': 'warning',
  'redirect-chain': 'warning',
  'structured-data': 'warning',
  'h1-single': 'error',
  'lang': 'error',
};

export function resolveConfig(config: SeoConfig): Required<SeoConfig> {
  return {
    baseUrl: config.baseUrl,
    rules: { ...DEFAULT_RULES, ...config.rules },
    pages: config.pages ?? [],
    discovery: config.discovery ?? { type: 'list', urls: ['/'] },
  };
}

export function resolvePageRules(
  config: Required<SeoConfig>,
  pagePath: string
): Required<SeoConfig>['rules'] {
  const pageConfig = resolvePageConfig(config, pagePath);
  if (!pageConfig?.rules) return config.rules;
  return { ...config.rules, ...pageConfig.rules };
}

/**
 * Returns the first page configuration that applies to the given path.
 * Page rules, execution mode, and wait strategy must all come from the same
 * matching entry so CLI execution matches the documented override behavior.
 */
export function resolvePageConfig(
  config: Pick<SeoConfig, 'pages'>,
  pagePath: string
): PageConfig | undefined {
  return config.pages?.find((page) => matchesPath(page.path, pagePath));
}

function matchesPath(pattern: string, path: string): boolean {
  if (pattern === path) return true;

  // Convert glob pattern to regex
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '(.+)')
    .replace(/\*/g, '([^/]+)');

  return new RegExp(`^${regexStr}$`).test(path);
}
