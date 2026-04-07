# API Reference

Complete reference for all functions, types, and Playwright matchers exported by `@seo-guardian/core`.

---

## Configuration Functions

### `defineSeoConfig(config)`

Defines the SEO configuration. A typed identity function that enables IDE autocomplete and type checking.

```typescript
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: 'http://localhost:3000',
  rules: { 'title-length': { min: 30, max: 60, severity: 'error' } },
});
```

**Signature:**

```typescript
function defineSeoConfig(config: SeoConfig): SeoConfig
```

---

### `resolveConfig(config)`

Merges defaults into the config and returns the resolved result. Use this when consuming the config programmatically.

```typescript
import { resolveConfig } from '@seo-guardian/core';

const resolved = resolveConfig(myConfig);
// resolved.rules contains all rules with defaults applied
```

**Signature:**

```typescript
function resolveConfig(config: SeoConfig): Required<SeoConfig>
```

---

### `resolvePageRules(config, pagePath)`

Resolves the rules that apply to a specific page path (including page-level overrides).

```typescript
const rules = resolvePageRules(resolvedConfig, '/preview/article-1');
// Returns ruleset with /preview/** overrides applied
```

**Signature:**

```typescript
function resolvePageRules(
  config: Required<SeoConfig>,
  pagePath: string
): Required<SeoConfig>['rules']
```

---

## Playwright Matchers

### `extendExpect(expect)`

Registers SEO matchers on Playwright's `expect`. Call this once in your test setup file.

```typescript
// tests/setup.ts
import { expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);
```

Or at the top of each test file:

```typescript
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);
```

---

### Matcher Reference

All matchers operate on a `Page` object. Using `expect.soft(page)` is recommended.

---

#### `toHaveSeoTitle(options?)`

Validates the existence and character length of the `<title>` tag.

```typescript
await expect.soft(page).toHaveSeoTitle();
await expect.soft(page).toHaveSeoTitle({ minLength: 30, maxLength: 60 });
```

| Option | Type | Default |
|---|---|---|
| `minLength` | `number` | `30` |
| `maxLength` | `number` | `60` |

Example failure message:
```
<title> is too short: 12 chars (min: 30). Current value: "My Page"
```

---

#### `toHaveSeoDescription(options?)`

Validates the existence and character length of `<meta name="description">`.

```typescript
await expect.soft(page).toHaveSeoDescription();
await expect.soft(page).toHaveSeoDescription({ minLength: 70, maxLength: 160 });
```

| Option | Type | Default |
|---|---|---|
| `minLength` | `number` | `70` |
| `maxLength` | `number` | `160` |

---

#### `toHaveSingleH1()`

Validates that exactly one `<h1>` exists on the page.

```typescript
await expect.soft(page).toHaveSingleH1();
```

Example failure message:
```
Found 2 <h1> elements, but exactly 1 is required. Values: "Products", "Recommended"
```

---

#### `toHaveCanonical(url?)`

Validates the existence of `<link rel="canonical">`. If `url` is provided, also validates the href value.

```typescript
// existence check only
await expect.soft(page).toHaveCanonical();

// also validate value
await expect.soft(page).toHaveCanonical('https://example.com/page');
```

| Argument | Type | Description |
|---|---|---|
| `url` | `string?` | Optional. If provided, validates the href matches |

---

#### `toHaveNoNoindex()`

Checks that no noindex directive is present.

```typescript
await expect.soft(page).toHaveNoNoindex();
```

Detects meta tags (`robots` / `googlebot`). HTTP header checking is handled by the `x-robots-tag` rule.

---

#### `toHaveLangAttribute()`

Checks that `<html lang="...">` is present and non-empty.

```typescript
await expect.soft(page).toHaveLangAttribute();
```

---

#### `toHaveRequiredOgTags(options?)`

Validates the presence of required Open Graph tags.

```typescript
// default: og:title / og:description / og:url / og:image
await expect.soft(page).toHaveRequiredOgTags();

// custom tag list
await expect.soft(page).toHaveRequiredOgTags({
  tags: ['og:title', 'og:description', 'og:url', 'og:image', 'og:type'],
});
```

| Option | Type | Default |
|---|---|---|
| `tags` | `string[]` | `['og:title','og:description','og:url','og:image']` |

---

#### `toHaveValidImgAlts()`

Validates the `alt` attribute on all `<img>` elements.

```typescript
await expect.soft(page).toHaveValidImgAlts();
```

- Missing `alt` → fail
- `alt="photo.jpg"` (filename-like) → fail
- `alt=""` → pass (decorative image)

Example failure message:
```
Found 2 img alt issue(s):
  - <img src="/hero.jpg"> is missing alt attribute
  - <img src="/banner.png"> has filename-only alt="banner.png"
```

---

#### `toHaveValidStructuredData(options?)`

Validates `<script type="application/ld+json">` in three levels.

```typescript
// syntax and @context/@type check only
await expect.soft(page).toHaveValidStructuredData();

// also check for specific @type and recommended fields
await expect.soft(page).toHaveValidStructuredData({ type: 'Article' });
await expect.soft(page).toHaveValidStructuredData({
  required: ['WebSite', 'Organization'],
});
```

| Option | Type | Description |
|---|---|---|
| `type` | `string?` | Required `@type` value (single) |
| `required` | `string[]?` | List of required `@type` values |

If both `type` and `required` are specified, `type` is prepended to `required`.

**Three-level validation:**

| Level | Status on failure |
|---|---|
| L1: JSON syntax | `fail` |
| L2: @context / @type | `fail` |
| L3: type-specific recommended fields | `warn` (treated as pass in `expect`) |

---

#### `toHaveNoInternalBrokenLinks(options?)`

Checks all internal links on the page (requires network access).

```typescript
await expect.soft(page).toHaveNoInternalBrokenLinks();
await expect.soft(page).toHaveNoInternalBrokenLinks({
  timeout: 5000,
  maxConcurrency: 3,
  ignorePatterns: [/\/admin\//],
});
```

| Option | Type | Default |
|---|---|---|
| `scope` | `'internal'\|'external'\|'all'` | `'internal'` |
| `timeout` | `number` | `5000` |
| `maxConcurrency` | `number` | `5` |
| `ignorePatterns` | `RegExp[]` | `[]` |
| `userAgent` | `string` | `'seo-guardian/0.1'` |

---

## Rule Functions (Programmatic Use)

Rules can be executed directly against an HTML string without Playwright.

### Common interface

```typescript
type RuleInput = {
  html: string;
  url: string;
  context: 'static' | 'rendered';
  responseHeaders?: Record<string, string>;
};
```

---

### `checkTitleLength(input, options?)`

```typescript
import { checkTitleLength } from '@seo-guardian/core';

const result = checkTitleLength(
  { html: '<html>...</html>', url: 'https://example.com/', context: 'static' },
  { min: 30, max: 60 }
);

console.log(result.status);   // 'pass' | 'fail' | 'warn'
console.log(result.message);  // 'Title length is 45 chars...'
```

---

### `checkDescriptionLength(input, options?)`

```typescript
const result = checkDescriptionLength(input, { min: 70, max: 160 });
```

---

### `checkH1Single(input)`

```typescript
const result = checkH1Single(input);
result.actual;  // string[] — list of actual h1 text values
```

---

### `checkCanonical(input, options?)`

```typescript
const result = checkCanonical(input, { expectedUrl: 'https://example.com/' });
```

---

### `checkNoindex(input)`

```typescript
// pass responseHeaders to also check X-Robots-Tag
const result = checkNoindex({
  html,
  url,
  context: 'static',
  responseHeaders: { 'x-robots-tag': 'noindex' },
});
```

---

### `checkLang(input)`

```typescript
const result = checkLang(input);
result.actual;  // string | null — value of html[lang]
```

---

### `checkOgRequired(input, options?)`

```typescript
const result = checkOgRequired(input, {
  tags: ['og:title', 'og:description', 'og:url', 'og:image'],
});
result.actual;  // Record<string, string> — og tags that were found
```

---

### `checkImgAlt(input)`

```typescript
const result = checkImgAlt(input);
result.actual;  // { src: string; alt: string | null }[]
```

---

### `checkStructuredData(input, options?)`

```typescript
const result = checkStructuredData(input, {
  required: ['WebSite', 'Organization'],
});
result.actual;  // Record<string, unknown>[] — parsed JSON-LD objects
```

---

### `checkHreflang(input)`

```typescript
const result = checkHreflang(input);
result.actual;  // { hreflang: string; href: string }[]
```

---

### `checkXRobotsTag(input)`

```typescript
const result = checkXRobotsTag({
  html,
  url,
  context: 'static',
  responseHeaders: { 'x-robots-tag': 'noindex, nofollow' },
});
result.actual;  // { headerValue: string | null; directives: string[] }
```

---

### `checkBrokenLinks(input, options?)`

Async. Requires network access.

```typescript
import { checkBrokenLinks } from '@seo-guardian/core';

const result = await checkBrokenLinks(
  { html, url, context: 'static' },
  { scope: 'internal', maxConcurrency: 5 }
);

result.actual;
// { url: string; status: number; sourceSelector: string }[]
// status === 0 means timeout / network error
```

---

### `checkRedirectChain(url, input, options?)`

Async. Requires network access. Unlike other rules, the first argument is the URL directly.

```typescript
import { checkRedirectChain } from '@seo-guardian/core';

const result = await checkRedirectChain(
  'http://example.com/',
  { url: 'http://example.com/', context: 'static' },
  { maxChainLength: 3 }
);

result.actual;
// {
//   hops: { url: string; status: number }[];
//   finalUrl: string;
//   chainLength: number;
// }
```

---

## Engine Functions

### `runFastMode(html, url, config, pageConfig?, responseHeaders?)`

Runs the Fast Mode engine (cheerio-based) directly.

```typescript
import { runFastMode } from '@seo-guardian/core';

const results = await runFastMode(
  html,
  'https://example.com/',
  myConfig,
  undefined,
  { 'x-robots-tag': 'noindex' }  // response headers
);

results.forEach((r) => {
  if (r.status === 'fail' && r.severity === 'error') {
    console.error(`[${r.ruleId}] ${r.message}`);
  }
});
```

---

### `fetchAndAnalyze(url, config)`

Shortcut that fetches a URL and runs Fast Mode.

```typescript
import { fetchAndAnalyze } from '@seo-guardian/core';

const results = await fetchAndAnalyze('https://example.com/', config);
```

---

## Type Definitions

```typescript
// Severity
type Severity = 'error' | 'warning' | 'info';

// Common result type for all rules
type TestResult<A = unknown, E = unknown> = {
  ruleId: string;
  status: 'pass' | 'fail' | 'warn';
  severity: Severity;
  actual: A;
  expected: E;
  selector?: string;
  message: string;
  context: 'static' | 'rendered';
  url: string;
  duration?: number;
  helpUrl?: string;
};

// Rule-specific type aliases
type TitleResult       = TestResult<string, { minLength: number; maxLength: number }>;
type DescriptionResult = TestResult<string, { minLength: number; maxLength: number }>;
type H1Result          = TestResult<string[], { count: 1 }>;
type CanonicalResult   = TestResult<string | null, { self: string }>;
type NoindexResult     = TestResult<boolean, { noindex: false }>;
type LangResult        = TestResult<string | null, { present: true }>;
type OgResult          = TestResult<Record<string, string>, { required: string[] }>;
type ImgAltResult      = TestResult<{ src: string; alt: string | null }[], { allPresent: true }>;
type StructuredDataResult = TestResult<Record<string, unknown>[], { required: string[] }>;
type LinkCheckResult   = TestResult<
  { url: string; status: number; sourceSelector: string }[],
  { maxBroken: 0 }
>;

// Configuration
type SeoConfig = {
  baseUrl: string;
  rules?: Partial<SeoRules>;
  pages?: PageConfig[];
  discovery?: DiscoveryConfig;
};

type WaitForStrategy =
  | { type: 'selector'; selector: string }
  | { type: 'title'; value: string | RegExp }
  | { type: 'networkidle' }
  | { type: 'load' };
```

All types are available as named exports:

```typescript
import type { TestResult, SeoConfig, WaitForStrategy } from '@seo-guardian/core';
```
