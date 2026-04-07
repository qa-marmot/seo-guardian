# What is seo-guardian?

> **"Protect SEO with code."**  
> Are you manually checking every deploy? seo-guardian defines SEO requirements as automated tests and enforces them in your CI/CD pipeline.

---

## Who is this for?

| Sound familiar? | seo-guardian solves it |
|---|---|
| Accidentally shipped `noindex` to production | Block the deploy in CI |
| Discovered missing `og:image` after release | Auto-detect at the PR stage |
| Title tag was way over 60 characters | Enforce length rules in code |
| SEO knowledge resets every time someone new joins | Document rules as code |
| Manually running Lighthouse after every release | Run automatically in CI |

---

## How it differs from diagnostic tools

seo-guardian plays a **different role** from Lighthouse or Google Search Console.

```
Lighthouse / Search Console
    Role:    Health check (visualize and score problems)
    Timing:  Manual review after deploy
    On fail: View report and fix manually

seo-guardian
    Role:    Guardrail (decide whether to deploy)
    Timing:  Automatic on PR creation / CI run
    On fail: exit code 1 — deploy is blocked
```

The two are complementary. Use seo-guardian to **automatically guarantee the minimum bar**, and Lighthouse to **raise quality further**.

---

## Three Design Principles

### 1. Fail Fast — Fail at Maximum Speed

The earlier an SEO problem is caught, the lower the cost. seo-guardian is designed to block at the PR stage. Any rule with `severity: 'error'` that fails causes the entire CI run to fail.

### 2. Hybrid Execution — Speed and Accuracy Together

```
Fast Mode (default)
    cheerio-based static HTML analysis
    No browser required → fast
    Ideal for SSR / static sites

Full Mode
    Post-render analysis via Playwright browser
    Supports SPA / CSR sites
    waitFor strategies to wait for hydration
```

The recommended pattern is to use Fast Mode for all pages in speed-sensitive CI, and Full Mode only for critical pages that need accuracy.

### 3. Config as Code — Document Your Rules

`seo.config.ts` is a TypeScript configuration file. IDE autocomplete works, and type checking passes. You can leave comments explaining *why* a rule exists, making it a living document of your team's SEO knowledge.

```typescript
export default defineSeoConfig({
  rules: {
    // Match search result display character limits
    'title-length': { min: 30, max: 60, severity: 'error' },

    // /preview/ pages need noindex for staging review
    // Do not apply the same rules as production
    'noindex': 'error',
  },
  pages: [
    { path: '/preview/**', rules: { 'noindex': 'off' } },
  ],
});
```

---

## Architecture Overview

```
CI/CD Pipeline
    │
    ├─ CLI (npx seo-test)          ← run from command line
    ├─ Playwright tests            ← embed in E2E test suite
    └─ seo.config.ts               ← configuration file
         │
         ▼
    Hybrid Engine
    ├─ Fast Mode: cheerio + HTTP fetch    (default)
    └─ Full Mode: Playwright + waitFor   (when mode: 'full')
         │
         ▼
    Rule Engine (12 rules)
    ├─ MVP:  title / description / h1 / canonical / noindex / lang / og-required / img-alt
    ├─ v1.1: structured-data / hreflang / robots-txt / x-robots-tag
    └─ v1.2: broken-links / redirect-chain
         │
         ▼
    Reporter
    ├─ Terminal (color output)
    ├─ JUnit XML (for CI)
    └─ JSON (for programmatic use)
```

---

## The TestResult Type — Common Shape for All Results

Every rule returns a `TestResult<A, E>` value.

```typescript
type TestResult<A = unknown, E = unknown> = {
  ruleId: string;        // e.g. 'title-length'
  status: 'pass' | 'fail' | 'warn';
  severity: 'error' | 'warning' | 'info';
  actual: A;             // actual value (type varies by rule)
  expected: E;           // expected value
  selector?: string;     // CSS selector of the offending element
  message: string;       // human-readable error message
  context: 'static' | 'rendered';
  url: string;
  duration?: number;     // execution time (ms)
  helpUrl?: string;      // link to Google documentation
};
```

When a rule with `severity: 'error'` produces `status: 'fail'`, CI fails. Rules with `severity: 'warning'` appear in the report but CI passes.

---

## Next Steps

- [Tutorial](./tutorial.en.md) — Run your first test in 5 minutes
- [Configuration Reference](./configuration.en.md) — All rule options in detail
- [API Reference](./api-reference.en.md) — Function signatures and matcher list
