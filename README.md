# seo-guardian 🛡️

> SEO quality gate for CI/CD pipelines — stop bad deploys before they go live.

**seo-guardian** は、SEO品質をコードで管理し、CI/CDパイプラインに組み込むための自動テストフレームワークです。  
石川県の制作チーム「[つくるところweb](https://tsukurutokoro.web)」が現場の課題から開発しました。

Lighthouseのような「診断ツール」とは役割が異なります。

| ツール | 役割 |
|---|---|
| Lighthouse / Search Console | 診断・可視化（健康診断） |
| **seo-guardian** | **デプロイ可否の判定（ガードレール）** |

SEOルール違反があれば **CIを失敗させ、デプロイを止めます。**

---

## 特徴

- **Fail Fast** — SEOルール違反を即座に検知してデプロイをブロック
- **ハイブリッド実行** — 高速な静的解析（Fast Mode）と、SPAに対応したブラウザレンダリング（Full Mode）を使い分け
- **ルール単位のマッチャー** — `expect.soft` と組み合わせて全チェックを網羅
- **柔軟な設定** — `seo.config.ts` でルールのon/off・globパターンによるページ別オーバーライドが可能
- **CIフレンドリーなレポート** — JUnit XML / JSON / Terminal Table に対応

---

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [チュートリアル](./docs/tutorial.md) | 5分でセットアップ〜GitHub Actions導入まで |
| [設定リファレンス](./docs/configuration.md) | 全12ルールのオプションと初期値 |
| [APIリファレンス](./docs/api-reference.md) | 関数・マッチャー・型定義の完全リファレンス |
| [設計思想](./docs/introduction.md) | なぜ「診断ツール」ではなく「ガードレール」なのか |

---

## Quick Start

### インストール

```bash
npm install --save-dev @seo-guardian/core @playwright/test
```

### 設定ファイル（`seo.config.ts`）

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
    // SPAはブラウザ描画後に検証（Full Mode）
    {
      path: '/',
      mode: 'full',
      waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
      rules: {
        'structured-data': { required: ['WebSite', 'Organization'] },
      },
    },
    // プレビューページは noindex を意図的に許可
    {
      path: '/preview/**',
      rules: { 'noindex': 'off' },
    },
  ],
});
```

### Playwright マッチャーで使う

```typescript
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);

test('トップページ SEO検証', async ({ page }) => {
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

### CLIで実行

```bash
# ターミナル出力（デフォルト）
npx seo-test --config seo.config.ts

# JUnit XML形式で出力（CI向け）
npx seo-test --config seo.config.ts --reporter junit --output test-results/seo.xml

# 単一URLをテスト
npx seo-test --url https://example.com/

# 本番環境に向けて実行
npx seo-test --config seo.config.ts --base-url https://example.com
```

---

## Playwrightマッチャー一覧

| マッチャー | 検証内容 |
|---|---|
| `toHaveSeoTitle(opts?)` | `<title>` の存在と文字数（デフォルト 30〜60文字） |
| `toHaveSeoDescription(opts?)` | `<meta name="description">` の存在と文字数（デフォルト 70〜160文字） |
| `toHaveSingleH1()` | `<h1>` がページに1つだけ存在するか |
| `toHaveCanonical(url?)` | canonical リンクの存在と値 |
| `toHaveNoNoindex()` | noindex ディレクティブの不在（meta タグ検出） |
| `toHaveLangAttribute()` | `<html lang="">` 属性の存在 |
| `toHaveRequiredOgTags(opts?)` | OGP必須タグ（og:title / og:description / og:url / og:image）の存在 |
| `toHaveValidImgAlts()` | 全 `<img>` の alt 属性の妥当性（missing・filename-only を検出） |
| `toHaveValidStructuredData(opts?)` | JSON-LD の構文・@context/@type・型別推奨フィールドを3段階で検証 |
| `toHaveNoInternalBrokenLinks(opts?)` | 内部リンク切れの確認（ネットワークアクセスあり） |

---

## ルール一覧

| ルール | デフォルト重大度 | 説明 |
|---|---|---|
| `title-length` | error | `<title>` の存在と文字数 |
| `description-length` | error | `<meta name="description">` の存在と文字数 |
| `h1-single` | error | `<h1>` がページに1つだけ存在するか |
| `canonical` | error | `<link rel="canonical">` の存在 |
| `noindex` | error | noindex ディレクティブの不在 |
| `lang` | error | `<html lang="">` 属性の存在 |
| `og-required` | error | OGP必須タグの存在 |
| `img-alt` | error | `<img>` の alt 属性の妥当性 |
| `structured-data` | warning | JSON-LDの3段階バリデーション |
| `hreflang` | off | hreflangアノテーションの整合性 |
| `robots-txt` | warning | robots.txtの存在と意図しないブロック検出 |
| `x-robots-tag` | warning | HTTPレスポンスヘッダーの X-Robots-Tag 検出 |
| `broken-links` | warning | リンク切れチェック（内部・外部を選択可） |
| `redirect-chain` | warning | リダイレクトチェーンの長さとループ検出 |

重大度が `error` のルールが `fail` になると、CLIは exit code 1 で終了しデプロイをブロックします。

---

## CI/CD 統合（GitHub Actions）

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

完全なワークフロー例は [チュートリアル](./docs/tutorial.md#6-github-actions-に組み込む) を参照してください。

---

## 実装状況

| フェーズ | ルール | ユニットテスト |
|---|---|---|
| MVP | title-length, description-length, h1-single, lang, canonical, noindex, og-required, img-alt | 98件 |
| v1.1 | structured-data（3段階）, hreflang, robots-txt, x-robots-tag | 51件 |
| v1.2 | broken-links, redirect-chain | 26件 |
| **合計** | **12ルール / 14設定キー** | **175件（全通過）** |
