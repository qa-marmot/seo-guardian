# Configuration Reference

All options for `seo.config.ts` explained.

---

## Basic Structure

```typescript
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: 'http://localhost:3000',   // required
  rules: { /* ... */ },              // optional (defaults provided)
  pages: [ /* ... */ ],              // optional
  discovery: { /* ... */ },          // optional
});
```

---

## `baseUrl`

The base URL of the site under test. Can be overridden with the CLI `--base-url` option.

```typescript
baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
```

---

## `rules` — Rule Configuration

### Configuration formats

Each rule can be specified in three ways:

```typescript
rules: {
  // Format 1: shorthand string
  'img-alt': 'error',        // enable (treat as error)
  'hreflang': 'off',         // disable

  // Format 2: object (detailed config)
  'title-length': { min: 30, max: 60, severity: 'error' },

  // Format 3: per-page override (see pages section below)
}
```

### Severity values

| Value | Behavior |
|---|---|
| `'error'` | CI fails on violation (exit code 1) |
| `'warning'` | Appears in report but CI passes |
| `'info'` | Recorded as information only |
| `'off'` | Rule disabled |

---

## Rule Reference and Defaults

### MVP Rules (enabled by default)

#### `title-length`

Validates the existence and character length of the `<title>` tag.

```typescript
'title-length': { min: 30, max: 60, severity: 'error' }
```

| Option | Type | Default | Description |
|---|---|---|---|
| `min` | `number` | `30` | Minimum character count |
| `max` | `number` | `60` | Maximum character count |
| `severity` | `Severity` | `'error'` | Severity on failure |

- Length is measured in **Unicode code points** (CJK characters count as 1)
- Missing tag also results in `fail`

---

#### `description-length`

Validates the existence and character length of `<meta name="description">`.

```typescript
'description-length': { min: 70, max: 160, severity: 'error' }
```

| Option | Type | Default | Description |
|---|---|---|---|
| `min` | `number` | `70` | Minimum character count |
| `max` | `number` | `160` | Maximum character count |
| `severity` | `Severity` | `'error'` | Severity on failure |

---

#### `h1-single`

Validates that exactly one `<h1>` element exists on the page.

```typescript
'h1-single': 'error'
```

- 0 found → `fail` (missing)
- 2 or more → `fail` (duplicate, all text values shown)
- Nested `<h1>` elements are also detected

---

#### `canonical`

Validates the existence and href of `<link rel="canonical">`.

```typescript
'canonical': 'error'
```

- Tag missing → `fail`
- Empty `href` → `fail`
- Set `expectedUrl` in page config to also validate the value

---

#### `noindex`

Checks that no noindex directive is present.

```typescript
'noindex': 'error'
```

Detected sources:
- `<meta name="robots" content="noindex,...">` (case-insensitive)
- `<meta name="googlebot" content="noindex,...">` 
- `X-Robots-Tag: noindex` response header

For intentional noindex (e.g. preview pages), use a page override:

```typescript
pages: [{ path: '/preview/**', rules: { 'noindex': 'off' } }]
```

---

#### `lang`

Validates the existence of the `<html lang="">` attribute.

```typescript
'lang': 'error'
```

- Attribute missing → `fail`
- Empty or whitespace-only value → `fail`
- Values like `"en"`, `"ja"`, `"en-US"` → `pass` (BCP47 validation is handled by the `hreflang` rule)

---

#### `og-required`

Validates the existence of required Open Graph tags.

```typescript
'og-required': 'error'
// or with detailed config
'og-required': {
  tags: ['og:title', 'og:description', 'og:url', 'og:image'],
  severity: 'error',
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `tags` | `string[]` | `['og:title','og:description','og:url','og:image']` | Required tag list |
| `severity` | `Severity` | `'error'` | Severity on failure |

- Tags with empty or whitespace-only content are treated as missing

---

#### `img-alt`

Validates the `alt` attribute on all `<img>` elements.

```typescript
'img-alt': 'error'
```

| State | Result |
|---|---|
| Missing `alt` attribute | `fail` (missing) |
| `alt=""` | `pass` (decorative image — valid) |
| `alt="photo.jpg"` (filename-like) | `fail` (filename-only) |
| `alt="Mountain view"` | `pass` |

---

### v1.1 Rules

#### `structured-data`

Validates `<script type="application/ld+json">` in three levels.

```typescript
'structured-data': 'warning'
// or with detailed config
'structured-data': {
  required: ['WebSite', 'Organization'],  // required @type values
  severity: 'warning',
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `string[]` | `[]` | List of `@type` values that must be present |
| `severity` | `Severity` | `'warning'` | Severity on failure |

**Three-level validation:**

| Level | What is checked | Result |
|---|---|---|
| L1 | Valid JSON | fail → `fail` |
| L2 | `@context` (schema.org) and `@type` present | fail → `fail` |
| L3 | Type-specific recommended fields | fail → `warn` |

Types supported in L3: `WebSite` `Organization` `Person` `Article` `BlogPosting` `Product` `BreadcrumbList` `FAQPage` `LocalBusiness` `Event` `Recipe` `VideoObject` `ImageObject` `WebPage` `SoftwareApplication`

---

#### `hreflang`

Validates `<link rel="alternate" hreflang="...">` for multilingual sites.

```typescript
'hreflang': 'off'  // disabled by default
// enable for multilingual sites
'hreflang': 'warning'
```

Checks:
- hreflang values are valid BCP 47 (`en`, `ja`, `zh-TW`, `x-default`, etc.)
- `href` is not empty
- `x-default` is present when multiple alternates exist
- No duplicate hreflang values

---

#### `robots-txt`

Validates the existence and content of `/robots.txt` (requires network access).

```typescript
'robots-txt': 'warning'
```

Checks:
- Fetchable with HTTP 200 (fetch failure → `fail`)
- `Disallow: /` is not set for all user agents (→ `fail`)
- `Sitemap:` directive is present (missing → `warn`)

---

#### `x-robots-tag`

Validates the `X-Robots-Tag` HTTP response header.

```typescript
'x-robots-tag': 'warning'
```

| Header value | Result |
|---|---|
| absent / `index` / `follow` | `pass` |
| `noindex` | `fail` |
| `nosnippet` / `unavailable_after` / `none` | `warn` |

Operates independently of `<meta name="robots">`. Use this to detect server-level noindex from CDN or proxy configuration.

---

### v1.2 Rules

#### `broken-links`

Checks links on the page (requires network access).

```typescript
'broken-links': 'warning'
// or with detailed config
'broken-links': {
  scope: 'internal',
  severity: 'error',
  timeout: 5000,
  maxConcurrency: 5,
  ignorePatterns: [/\/api\//],
  userAgent: 'my-bot/1.0',
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `scope` | `'internal'\|'external'\|'all'` | `'internal'` | Which links to check |
| `timeout` | `number` | `5000` | Request timeout (ms) |
| `maxConcurrency` | `number` | `5` | Max parallel requests |
| `ignorePatterns` | `RegExp[]` | `[]` | href patterns to skip |
| `userAgent` | `string` | `'seo-guardian/0.1'` | User-Agent header |

Default ignored schemes: `mailto:` `tel:` `javascript:` `#` `data:`

---

#### `redirect-chain`

Detects redirect chains and loops (requires network access).

```typescript
'redirect-chain': 'warning'
```

- Chain longer than `maxChainLength` (default: 3) → `fail`
- Redirect loop detected → `fail`
- HTTP → HTTPS redirect → `warn`

---

## `pages` — Per-Page Configuration

### Basic structure

```typescript
pages: [
  {
    path: '/blog/**',          // glob pattern
    mode: 'fast',              // 'fast' | 'full' (default: 'fast')
    waitFor: { /* ... */ },    // Full Mode wait strategy
    rules: { /* ... */ },      // rule overrides for this path
  },
]
```

### `path` — glob patterns

| Pattern | Matches |
|---|---|
| `/` | Top page only |
| `/blog/*` | `/blog/article-1` (single segment) |
| `/blog/**` | `/blog/2024/01/post` (any depth) |
| `/preview/**` | `/preview/any/path` |

### `waitFor` — Full Mode wait strategies

```typescript
// Wait until a selector appears in the DOM
{ type: 'selector', selector: 'meta[name="description"][content]' }

// Wait until the title becomes a specific value
{ type: 'title', value: 'Home | MySite' }
{ type: 'title', value: /Home/ }  // RegExp also works

// Wait for network to settle
{ type: 'networkidle' }

// Wait for page load event
{ type: 'load' }
```

### Rule override priority

```
page rules > global rules > defaults
```

---

## `discovery` — URL Discovery

Configures which URLs the CLI tests.

### Format 1: explicit list

```typescript
discovery: {
  type: 'list',
  urls: ['/', '/about', '/blog', '/contact'],
}
```

### Format 2: sitemap

```typescript
discovery: {
  type: 'sitemap',
  url: '/sitemap.xml',    // absolute URL or path relative to baseUrl
  limit: 50,              // max URLs to fetch (default: all)
}
```

### Format 3: crawl

```typescript
discovery: {
  type: 'crawl',
  startUrl: '/',
  limit: 100,
}
```

---

## All Defaults

```typescript
// from src/config.ts
const DEFAULT_RULES = {
  'title-length':       { min: 30, max: 60, severity: 'error' },
  'description-length': { min: 70, max: 160, severity: 'error' },
  'h1-single':          'error',
  'canonical':          'error',
  'noindex':            'error',
  'lang':               'error',
  'og-required':        'error',
  'img-alt':            'error',
  'structured-data':    'warning',
  'hreflang':           'off',       // enable for multilingual sites
  'robots-txt':         'warning',
  'x-robots-tag':       'warning',
  'broken-links':       'warning',
};
```

The default for `discovery` is `{ type: 'list', urls: ['/'] }` (top page only).
