// Public API
export { defineSeoConfig, resolveConfig, resolvePageRules } from './config.js';
export { extendExpect } from './matchers/index.js';

// Rule functions (for programmatic use)
export { checkTitleLength } from './rules/title-length.js';
export { checkDescriptionLength } from './rules/description-length.js';
export { checkH1Single } from './rules/h1-single.js';
export { checkLang } from './rules/lang.js';
export { checkCanonical } from './rules/canonical.js';
export { checkNoindex } from './rules/noindex.js';
export { checkOgRequired } from './rules/og-required.js';
export { checkImgAlt } from './rules/img-alt.js';
export { checkStructuredData } from './rules/structured-data.js';
export { checkHreflang } from './rules/hreflang.js';
export { checkXRobotsTag } from './rules/x-robots-tag.js';
export { checkBrokenLinks } from './rules/broken-links.js';
export { checkRedirectChain } from './rules/redirect-chain.js';

// Engine
export { runFastMode, fetchAndAnalyze } from './engine/fast-mode.js';

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
