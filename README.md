# seo-guardian 🛡️
 
> SEO quality gate for CI/CD pipelines — stop bad deploys before they go live.
---
 
## 何を作りたいか
 
**seo-guardian** は、SEO品質をコードで管理し、CI/CDパイプラインに組み込むための自動テストフレームワークを想定しています。
 
Lighthouseのような「診断ツール」とは役割が異なります。
 
| ツール | 役割 |
|--------|------|
| Lighthouse / Search Console | 診断・可視化（健康診断） |
| **seo-guardian** | **デプロイ可否の判定（ガードレール）** |
 
SEOルール違反があれば **CIを失敗させ、デプロイを止めます。**  
「担当者の目視確認」から「コードによる継続的な保証」へ。
 
---
 
## 特徴
 
- 🚀 **Fail Fast** — SEOルール違反を即座に検知してデプロイをブロック
- ⚡ **ハイブリッド実行** — 高速な静的解析（Fast Mode）と、SPAに対応したブラウザレンダリング（Full Mode）を使い分け
- 🎯 **ルール単位のマッチャー** — `expect.soft` と組み合わせて全チェックを網羅。エラーメッセージが具体的でデバッグしやすい
- 🔧 **柔軟な設定** — `seo.config.ts` でルールのon/off・ページ別オーバーライドが可能
- 📊 **CIフレンドリーなレポート** — JUnit XML / JSON / Terminal Table に対応
 
---

## Quick Start

### Install

```bash
npm install --save-dev @seo-guardian/core @playwright/test
```

### Configure

Create `seo.config.ts` in your project root:

```typescript
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',

  rules: {
    'title-length':       { min: 30, max: 60, severity: 'error' },
    'description-length': { min: 70, max: 160, severity: 'error' },
    'img-alt':            'error',
    'canonical':          'error',
    'noindex':            'error',
    'og-required':        'error',
    'structured-data':    'warning',
  },

  pages: [
    {
      path: '/',
      mode: 'full',
      waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
      rules: {
        'structured-data': { required: ['WebSite', 'Organization'] },
      },
    },
    {
      path: '/preview/**',
      rules: { 'noindex': 'off' },
    },
  ],
});
```

### Use Playwright Matchers

```typescript
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);

test('homepage SEO', async ({ page }) => {
  await page.goto('/');
  await expect.soft(page).toHaveSeoTitle({ minLength: 30, maxLength: 60 });
  await expect.soft(page).toHaveSeoDescription({ minLength: 70, maxLength: 160 });
  await expect.soft(page).toHaveSingleH1();
  await expect.soft(page).toHaveCanonical('https://example.com/');
  await expect.soft(page).toHaveNoNoindex();
  await expect.soft(page).toHaveRequiredOgTags();
  await expect.soft(page).toHaveValidImgAlts();
  await expect.soft(page).toHaveValidStructuredData({ type: 'WebSite' });
});
```

### Run via CLI

```bash
npx seo-test --config seo.config.ts
npx seo-test --config seo.config.ts --reporter junit --output test-results/seo.xml
```

## API Reference

### `defineSeoConfig(config)`

Defines a typed SEO configuration with full IDE autocompletion.

### `extendExpect(expect)`

Registers all SEO matchers on Playwright's `expect`. Call once in your global setup.

### Matchers

| Matcher | Description |
|---|---|
| `toHaveSeoTitle(opts?)` | title tag length and presence |
| `toHaveSeoDescription(opts?)` | description meta length and presence |
| `toHaveSingleH1()` | exactly one h1 element |
| `toHaveCanonical(url?)` | canonical link presence and value |
| `toHaveNoNoindex()` | noindex absent in production |
| `toHaveLangAttribute()` | html[lang] presence |
| `toHaveRequiredOgTags(tags?)` | OGP required tags |
| `toHaveValidImgAlts()` | img alt attribute validity |
| `toHaveValidStructuredData(opts?)` | JSON-LD syntax and schema |

### Rule IDs

| Rule | Default Severity |
|---|---|
| `title-length` | error |
| `description-length` | error |
| `h1-single` | error |
| `canonical` | error |
| `noindex` | error |
| `lang` | error |
| `og-required` | error |
| `img-alt` | error |
| `structured-data` | warning |
| `hreflang` | off |

## CI Integration (GitHub Actions)

```yaml
- name: SEO Tests
  run: npx seo-test --config seo.config.ts --reporter junit

- name: Upload SEO Test Results
  uses: actions/upload-artifact@v4
  with:
    name: seo-test-results
    path: test-results/seo.xml
```

## Development Roadmap

- **MVP**: title, description, h1, canonical, noindex, lang, og-required, img-alt
- **v1.1**: structured-data, hreflang, robots-txt, x-robots-tag
- **v1.2**: broken-links, redirect-chain
