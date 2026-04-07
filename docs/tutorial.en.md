# Tutorial — Start Using seo-guardian Today

> **Stop deploying broken SEO.** This tutorial gets you from zero to a working CI gate in about 5 minutes.

---

## 0. What You'll Accomplish

By the end of this tutorial you will be able to:

- **Add SEO tests in 5 minutes** (integrate into an existing Playwright project)
- **Auto-detect noindex leaks in CI** and block the deploy
- **Set different rules per page** (e.g. allow noindex on `/preview/**`)
- **Pass JUnit XML to GitHub Actions** to visualize test results

---

## 1. Installation

```bash
npm install --save-dev @seo-guardian/core @playwright/test
```

If Playwright is not yet installed, also install the browser:

```bash
npx playwright install chromium
```

---

## 2. Write Your First Test (5 minutes)

### 2-1. Create the config file

Create `seo.config.ts` in your project root:

```typescript
// seo.config.ts
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
  },
});
```

### 2-2. Write a test file

```typescript
// tests/seo/homepage.spec.ts
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);

test('Homepage SEO', async ({ page }) => {
  await page.goto('/');

  await expect.soft(page).toHaveSeoTitle({ minLength: 30, maxLength: 60 });
  await expect.soft(page).toHaveSeoDescription({ minLength: 70, maxLength: 160 });
  await expect.soft(page).toHaveSingleH1();
  await expect.soft(page).toHaveCanonical();
  await expect.soft(page).toHaveNoNoindex();
  await expect.soft(page).toHaveLangAttribute();
  await expect.soft(page).toHaveRequiredOgTags();
  await expect.soft(page).toHaveValidImgAlts();
});
```

> **Why `expect.soft`?**  
> `expect.soft` continues after failures. One test run surfaces all SEO problems on the page at once.

### 2-3. Run it

```bash
npx playwright test tests/seo/
```

Results appear in color in the terminal:

```
✓ [title-length] <title> length is 45 chars — within range [30, 60].
✗ [noindex] Found noindex directive in meta[name="robots"] content="noindex"
  → https://developers.google.com/search/docs/crawling-indexing/block-indexing
✓ [h1-single] Found exactly 1 <h1>: "Home"
```

---

## 3. Bulk Check via CLI (Entire Site)

### 3-1. Basic usage

```bash
npx seo-test --config seo.config.ts
```

Check multiple URLs at once without a browser (Fast Mode).

### 3-2. Test a single URL

```bash
npx seo-test --url https://example.com/blog/article-1
```

### 3-3. Point at production

```bash
BASE_URL=https://example.com npx seo-test --config seo.config.ts
```

### 3-4. JUnit output for CI

```bash
npx seo-test --config seo.config.ts --reporter junit --output test-results/seo.xml
```

If any error is found, the CLI exits with **exit code 1**, acting as a deploy gate.

---

## 4. Per-Page Rule Overrides

Real sites have varying requirements — preview pages need noindex, blog posts need Article structured data, and so on.

```typescript
// seo.config.ts
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',

  rules: {
    'title-length':    { min: 30, max: 60, severity: 'error' },
    'noindex':         'error',
    'structured-data': 'warning',
  },

  pages: [
    // Homepage: SPA — validate after browser rendering (Full Mode)
    {
      path: '/',
      mode: 'full',
      waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
      rules: {
        'structured-data': { required: ['WebSite', 'Organization'] },
      },
    },

    // Blog posts: require Article structured data
    {
      path: '/blog/**',
      rules: {
        'structured-data': { required: ['Article'] },
        'og-required': {
          tags: ['og:title', 'og:description', 'og:url', 'og:image'],
          severity: 'error',
        },
      },
    },

    // Preview pages: noindex is intentional
    {
      path: '/preview/**',
      rules: { 'noindex': 'off' },
    },
  ],
});
```

`path` supports `**` (any depth) and `*` (single segment) glob patterns.

---

## 5. Fast Mode vs Full Mode

| | Fast Mode (default) | Full Mode |
|---|---|---|
| Engine | HTTP fetch + cheerio | Playwright browser |
| Speed | Fast (no browser) | Slower (startup cost) |
| Best for | SSR / static sites / many URLs | SPA / CSR / post-hydration DOM |
| Config | default | `mode: 'full'` in page config |

**Full Mode waitFor strategies**

SPAs require waiting for render to complete before validating:

```typescript
pages: [
  // Wait until a selector appears (most reliable)
  {
    path: '/',
    mode: 'full',
    waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
  },
  // Wait until the title changes
  {
    path: '/dashboard',
    mode: 'full',
    waitFor: { type: 'title', value: /Dashboard/ },
  },
  // Wait for network to settle
  {
    path: '/heavy-page',
    mode: 'full',
    waitFor: { type: 'networkidle' },
  },
]
```

---

## 6. GitHub Actions Integration

### Complete workflow example

```yaml
# .github/workflows/seo.yml
name: SEO Quality Gate

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  seo-test:
    name: SEO Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start dev server
        run: npm run build && npm run preview &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Run SEO tests (CLI)
        run: |
          npx seo-test \
            --config seo.config.ts \
            --reporter junit \
            --output test-results/seo.xml
        env:
          BASE_URL: http://localhost:3000

      - name: Run SEO E2E tests
        run: npx playwright test tests/seo/
        env:
          BASE_URL: http://localhost:3000

      - name: Upload SEO test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: seo-test-results
          path: |
            test-results/seo.xml
            playwright-report/

      - name: Report test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: SEO Test Results
          path: test-results/seo.xml
          reporter: java-junit
```

### What it looks like

```
Pull Request opened
    │
    ▼
SEO Quality Gate (GitHub Actions)
    │
    ├─ title: "Products | MyStore" → 13 chars → ❌ FAIL (min: 30)
    ├─ noindex: <meta name="robots" content="noindex"> → ❌ FAIL
    ├─ h1-single: 2 <h1> elements found → ❌ FAIL
    │
    └─ exit code 1 → PR merge blocked
```

---

## 7. Add Broken Link Checking (v1.2)

```typescript
// seo.config.ts
rules: {
  'broken-links': {
    scope: 'internal',
    severity: 'error',
    timeout: 5000,
    maxConcurrency: 5,
    ignorePatterns: [/\/api\//, /\/admin\//],
  },
}
```

Or validate individual pages with a Playwright matcher:

```typescript
test('Broken link check', async ({ page }) => {
  await page.goto('/');
  await expect.soft(page).toHaveNoInternalBrokenLinks({
    timeout: 5000,
    ignorePatterns: [/mailto:/, /tel:/],
  });
});
```

---

## 8. Validate Structured Data (v1.1)

```typescript
test('Blog post structured data', async ({ page }) => {
  await page.goto('/blog/my-article');

  // Check that Article type exists with required fields
  await expect.soft(page).toHaveValidStructuredData({ type: 'Article' });
});
```

Three-level validation:

| Level | What is checked | On failure |
|---|---|---|
| L1 | Valid JSON syntax | `fail` |
| L2 | `@context` and `@type` present | `fail` |
| L3 | Type-specific recommended fields | `warn` |

---

## 9. FAQ

### Q: What is the difference between `expect.soft` and regular `expect`?

`expect` stops at the first failure. `expect.soft` runs all assertions and fails at the end with all issues collected. For SEO checks where you want to see everything at once, `expect.soft` is the right choice.

### Q: The noindex rule is triggering a false positive

Pages where noindex is intentional (like `/preview/**`) should be excluded using a page override:

```typescript
pages: [
  { path: '/preview/**', rules: { 'noindex': 'off' } }
]
```

### Q: Are CJK characters (Japanese, Chinese, Korean) counted fairly?

seo-guardian counts **Unicode code points** (`[...str].length`), not bytes. One Japanese character = 1 character.

### Q: Does it work with SPAs (Next.js / Nuxt / Astro)?

Yes. Use `mode: 'full'` with a `waitFor` strategy to validate the post-hydration DOM:

```typescript
pages: [
  {
    path: '/',
    mode: 'full',
    waitFor: { type: 'networkidle' },
  },
]
```

---

## Next Steps

- [Configuration Reference](./configuration.en.md) — All rule options and defaults
- [API Reference](./api-reference.en.md) — Function signatures and Playwright matcher list
- [Design Philosophy](./introduction.en.md) — Why a guardrail, not a diagnostic tool
