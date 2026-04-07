// Public API
export { defineSeoConfig, resolveConfig, resolvePageRules } from './config.js';
export { extendExpect } from './matchers/index.js';

// Type exports
export type {
  Severity,
  RuleStatus,
  ExecutionContext,
  TestResult,
  TitleResult,
  DescriptionResult,
  H1Result,
  CanonicalResult,
  NoindexResult,
  LangResult,
  OgResult,
  ImgAltResult,
  StructuredDataResult,
  LinkCheckResult,
  SeoConfig,
  SeoRules,
  PageConfig,
  WaitForStrategy,
  ExecutionMode,
  DiscoveryConfig,
  RuleConfig,
  RuleSeverityShorthand,
  TitleLengthOptions,
  DescriptionLengthOptions,
  OgRequiredOptions,
  BrokenLinksOptions,
  StructuredDataOptions,
  RuleInput,
  RuleFunction,
} from './types.js';
