export type Severity = 'error' | 'warning' | 'info';

export type RuleStatus = 'pass' | 'fail' | 'warn';

export type ExecutionContext = 'static' | 'rendered';

export type TestResult<A = unknown, E = unknown> = {
  ruleId: string;
  status: RuleStatus;
  severity: Severity;
  actual: A;
  expected: E;
  selector?: string;
  message: string;
  context: ExecutionContext;
  url: string;
  duration?: number;
  helpUrl?: string;
};

// Rule-specific result types
export type TitleResult = TestResult<string, { minLength: number; maxLength: number }>;
export type DescriptionResult = TestResult<string, { minLength: number; maxLength: number }>;
export type H1Result = TestResult<string[], { count: 1 }>;
export type CanonicalResult = TestResult<string | null, { self: string }>;
export type NoindexResult = TestResult<boolean, { noindex: false }>;
export type LangResult = TestResult<string | null, { present: true }>;
export type OgResult = TestResult<Record<string, string>, { required: string[] }>;
export type ImgAltResult = TestResult<{ src: string; alt: string | null }[], { allPresent: true }>;
export type StructuredDataResult = TestResult<
  Record<string, unknown>[],
  { required: string[] }
>;
export type LinkCheckResult = TestResult<
  { url: string; status: number; sourceSelector: string }[],
  { maxBroken: 0 }
>;

// Rule severity config
export type RuleSeverityShorthand = 'error' | 'warning' | 'info' | 'off';

export type TitleLengthOptions = {
  min?: number;
  max?: number;
  severity?: Severity;
};

export type DescriptionLengthOptions = {
  min?: number;
  max?: number;
  severity?: Severity;
};

export type OgRequiredOptions = {
  tags?: string[];
  severity?: Severity;
};

export type BrokenLinksOptions = {
  scope?: 'internal' | 'external' | 'all';
  severity?: Severity;
  externalScope?: RuleSeverityShorthand;
  timeout?: number;
  ignorePatterns?: RegExp[];
  maxConcurrency?: number;
  userAgent?: string;
};

export type StructuredDataOptions = {
  required?: string[];
  severity?: Severity;
};

export type RuleConfig =
  | RuleSeverityShorthand
  | TitleLengthOptions
  | DescriptionLengthOptions
  | OgRequiredOptions
  | BrokenLinksOptions
  | StructuredDataOptions;

export type WaitForStrategy =
  | { type: 'selector'; selector: string }
  | { type: 'title'; value: string | RegExp }
  | { type: 'networkidle' }
  | { type: 'load' };

export type ExecutionMode = 'fast' | 'full';

export type PageConfig = {
  path: string;
  mode?: ExecutionMode;
  waitFor?: WaitForStrategy;
  rules?: Partial<SeoRules>;
};

export type DiscoveryConfig =
  | { type: 'sitemap'; url: string; limit?: number }
  | { type: 'list'; urls: string[] }
  | { type: 'crawl'; startUrl: string; limit?: number };

export type SeoRules = {
  'title-length': RuleSeverityShorthand | TitleLengthOptions;
  'description-length': RuleSeverityShorthand | DescriptionLengthOptions;
  'img-alt': RuleSeverityShorthand;
  'canonical': RuleSeverityShorthand;
  'noindex': RuleSeverityShorthand;
  'og-required': RuleSeverityShorthand | OgRequiredOptions;
  'hreflang': RuleSeverityShorthand;
  'robots-txt': RuleSeverityShorthand;
  'x-robots-tag': RuleSeverityShorthand;
  'broken-links': RuleSeverityShorthand | BrokenLinksOptions;
  'structured-data': RuleSeverityShorthand | StructuredDataOptions;
  'h1-single': RuleSeverityShorthand;
  'lang': RuleSeverityShorthand;
};

export type SeoConfig = {
  baseUrl: string;
  rules?: Partial<SeoRules>;
  pages?: PageConfig[];
  discovery?: DiscoveryConfig;
};

export type RuleInput = {
  html: string;
  url: string;
  context: ExecutionContext;
  responseHeaders?: Record<string, string>;
};

export type RuleFunction<R extends TestResult = TestResult> = (
  input: RuleInput,
  options?: Record<string, unknown>
) => R | Promise<R>;
