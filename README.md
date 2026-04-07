# seo-guardian

> **SEO quality gate for CI/CD pipelines — stop bad deploys before they go live.**

[![npm version](https://badge.fury.io/js/@seo-guardian%2Fcore.svg)](https://www.npmjs.com/package/@seo-guardian/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**seo-guardian** enforces SEO requirements as automated tests that run in your CI/CD pipeline — blocking deploys the moment an SEO rule is violated.

[日本語ドキュメントはこちら](./README.ja.md)

---

## Why seo-guardian, not Lighthouse CI?

| Feature | Lighthouse CI | **seo-guardian** |
|---|---|---|
| Fail deploys on SEO violations | Score threshold only | **Per-rule severity (`error`/`warning`)** |
| Page-level rule overrides | — | **Glob patterns (`/preview/**` → noindex: off)** |
| TypeScript-typed config | JSON | **`seo.config.ts` with IDE autocomplete** |
| Playwright matcher integration | — | **`expect.soft(page).toHaveNoNoindex()`** |
| X-Robots-Tag header detection | — | **HTTP response header analysis** |
| Fast static analysis (no browser) | Requires Chrome | **cheerio-based Fast Mode** |
| SPA support | — | **Full Mode with `waitFor` strategies** |
| Broken link checking | — | **Built-in with concurrency control** |

Lighthouse is a diagnostic tool (health check). seo-guardian is a **guardrail** — it blocks the deploy.

---

## Installation

```bash
npm install --save-dev @seo-guardian/core @playwright/test
```

---

## Quick Start

### 1. Create `seo.config.ts`

```typescript
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',

  rules: {
    'title-length':       { min: 30, max: 60, severity: 'error' },
    'description-length': { min: 70, max: 160, severity: 'error' },
    'h1-single':          'error',
    'canonical':          'error',
    'noindex':            'error',
    'lang':               'error',
    'og-required':        'error',
    'img-alt':            'error',
    'structured-data':    'warning',
  },

  pages: [
    // SPA: validate after browser rendering
    {
      path: '/',
      mode: 'full',
      waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
      rules: {
        'structured-data': { required: ['WebSite', 'Organization'] },
      },
    },
    // Preview pages: intentionally allow noindex
    {
      path: '/preview/**',
      rules: { 'noindex': 'off' },
    },
  ],
});
```

### 2. Use Playwright matchers

```typescript
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);

test('Homepage SEO', async ({ page }) => {
  await page.goto('/');
  await expect.soft(page).toHaveSeoTitle({ minLength: 30, maxLength: 60 });
  await expect.soft(page).toHaveSeoDescription({ minLength: 70, maxLength: 160 });
  await expect.soft(page).toHaveSingleH1();
  await expect.soft(page).toHaveCanonical('https://example.com/');
  await expect.soft(page).toHaveNoNoindex();
  await expect.soft(page).toHaveLangAttribute();
  await expect.soft(page).toHaveRequiredOgTags();
  await expect.soft(page).toHaveValidImgAlts();
  await expect.soft(page).toHaveValidStructuredData({ type: 'WebSite' });
});
```

> **Why `expect.soft`?** It continues after failures, so one test run surfaces all SEO issues at once.

### 3. Run via CLI

```bash
# Terminal output (default)
npx seo-test --config seo.config.ts

# JUnit XML for CI
npx seo-test --config seo.config.ts --reporter junit --output test-results/seo.xml

# Test a single URL
npx seo-test --url https://example.com/

# Point at production
npx seo-test --config seo.config.ts --base-url https://example.com
```

Any rule with `severity: 'error'` that fails causes **exit code 1**, blocking the deploy.

---

## GitHub Actions

```yaml
- name: SEO Tests
  run: |
    npx seo-test \
      --config seo.config.ts \
      --reporter junit \
      --output test-results/seo.xml
  env:
    BASE_URL: http://localhost:3000

- name: Upload SEO Test Results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: seo-test-results
    path: test-results/seo.xml
```

---

## Playwright Matchers

| Matcher | What it checks |
|---|---|
| `toHaveSeoTitle(opts?)` | `<title>` existence and length (default 30–60 chars) |
| `toHaveSeoDescription(opts?)` | `<meta name="description">` existence and length (default 70–160 chars) |
| `toHaveSingleH1()` | Exactly one `<h1>` on the page |
| `toHaveCanonical(url?)` | `<link rel="canonical">` existence and optional value match |
| `toHaveNoNoindex()` | No noindex directive in meta tags |
| `toHaveLangAttribute()` | `<html lang="">` attribute present and non-empty |
| `toHaveRequiredOgTags(opts?)` | OG required tags: og:title / og:description / og:url / og:image |
| `toHaveValidImgAlts()` | All `<img>` have valid alt attributes (missing and filename-only detected) |
| `toHaveValidStructuredData(opts?)` | JSON-LD syntax, @context/@type, type-specific recommended fields |
| `toHaveNoInternalBrokenLinks(opts?)` | All internal links return non-4xx/5xx status |

---

## Rules

| Rule | Default Severity | Description |
|---|---|---|
| `title-length` | error | `<title>` existence and length |
| `description-length` | error | `<meta name="description">` existence and length |
| `h1-single` | error | Exactly one `<h1>` per page |
| `canonical` | error | `<link rel="canonical">` presence |
| `noindex` | error | No noindex directive |
| `lang` | error | `<html lang="">` attribute |
| `og-required` | error | Required OGP tags |
| `img-alt` | error | Valid `alt` attributes on all `<img>` |
| `structured-data` | warning | 3-level JSON-LD validation |
| `hreflang` | off | hreflang annotation consistency |
| `robots-txt` | warning | robots.txt existence and unintended blocking |
| `x-robots-tag` | warning | X-Robots-Tag HTTP response header |
| `broken-links` | warning | Broken link detection (internal/external) |
| `redirect-chain` | warning | Redirect chain length and loop detection |

Rules with `severity: 'error'` that reach `status: 'fail'` cause CLI to exit with code 1.

---

## Fast Mode vs Full Mode

|  | Fast Mode (default) | Full Mode |
|---|---|---|
| Engine | HTTP fetch + cheerio | Playwright browser |
| Speed | Fast (no browser) | Slower (browser startup) |
| Best for | SSR / static sites | SPA / CSR / hydrated DOM |
| Config | default | `mode: 'full'` per page |

```typescript
pages: [
  // Wait for hydration before validating
  {
    path: '/app',
    mode: 'full',
    waitFor: { type: 'networkidle' },
  },
]
```

---

## Page-Level Rule Overrides

```typescript
pages: [
  // Blog posts require Article structured data
  {
    path: '/blog/**',
    rules: {
      'structured-data': { required: ['Article'] },
    },
  },
  // Preview pages: noindex is intentional
  {
    path: '/preview/**',
    rules: { 'noindex': 'off' },
  },
]
```

Priority: **page rules > global rules > defaults**

---

## Implementation Status

| Phase | Rules | Unit Tests |
|---|---|---|
| MVP | title-length, description-length, h1-single, lang, canonical, noindex, og-required, img-alt | 98 |
| v1.1 | structured-data (3-level), hreflang, robots-txt, x-robots-tag | 51 |
| v1.2 | broken-links, redirect-chain | 26 |
| **Total** | **12 rules / 14 config keys** | **175 (all passing)** |

---

## Documentation

| Document | Contents |
|---|---|
| [Tutorial](./docs/tutorial.md) | From setup to GitHub Actions in 5 minutes (Japanese) |
| [Configuration Reference](./docs/configuration.md) | All 12 rules with options and defaults (Japanese) |
| [API Reference](./docs/api-reference.md) | Functions, matchers, and type definitions (Japanese) |
| [Design Philosophy](./docs/introduction.md) | Why a guardrail, not a diagnostic tool (Japanese) |

---

## License

MIT © [QAmamomamo](https://github.com/qa-marmot)
