# チュートリアル — 今日から使う seo-guardian

> **石川県の制作チーム「つくるところweb」が現場で生まれた課題から作ったツールです。**  
> 「Lighthouseでは毎リリース後に手動確認が必要」「noindexを本番に出してしまった」——そういった事故をコードで防ぐ仕組みを、開発者のあなたが自分のプロジェクトに組み込めるよう設計しました。

---

## 0. このチュートリアルで何ができるか

このチュートリアルを終えると、次のことができます。

- **5分でSEOテストを追加**できる（既存のPlaywrightプロジェクトへの組み込み）
- **CIでnoindex漏れを自動検知**し、デプロイを止められる
- **ページごとに違うルール**（例：`/preview/**` は noindex を許可）を設定できる
- **JUnit XML** を GitHub Actions に渡してテスト結果を可視化できる

---

## 1. インストール

```bash
npm install --save-dev @seo-guardian/core @playwright/test
```

Playwright がまだ未導入の場合は、ブラウザもあわせてインストールします。

```bash
npx playwright install chromium
```

---

## 2. 最初のテストを書く（5分）

### 2-1. 設定ファイルを作る

プロジェクトルートに `seo.config.ts` を作成します。

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

### 2-2. テストファイルを書く

```typescript
// tests/seo/homepage.spec.ts
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);

test('トップページ SEO検証', async ({ page }) => {
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

> **`expect.soft` を使う理由**  
> `expect.soft` は失敗しても後続のアサーションを続けます。1回のテスト実行でページ上のSEO問題を全部洗い出せます。

### 2-3. 実行する

```bash
npx playwright test tests/seo/
```

ターミナルに色付きで結果が表示されます。

```
✓ [title-length] <title> length is 45 chars — within range [30, 60].
✗ [noindex] Found noindex directive in meta[name="robots"] content="noindex"
  → https://developers.google.com/search/docs/crawling-indexing/block-indexing
✓ [h1-single] Found exactly 1 <h1>: "トップページ"
```

---

## 3. CLIで一括チェック（サイト全体）

### 3-1. 基本的な使い方

```bash
npx seo-test --config seo.config.ts
```

ブラウザなしで複数URLをまとめてチェックできます（Fast Mode）。

### 3-2. URLを指定して単体テスト

```bash
npx seo-test --url https://example.com/blog/article-1
```

### 3-3. 本番環境に向けて実行

```bash
BASE_URL=https://example.com npx seo-test --config seo.config.ts
```

### 3-4. JUnit形式で出力（CI向け）

```bash
npx seo-test --config seo.config.ts --reporter junit --output test-results/seo.xml
```

エラーが1件でもあれば **exit code 1** で終了するため、CI/CDのデプロイゲートとして機能します。

---

## 4. ページごとにルールを変える

実際のサイトでは「プレビューページは noindex が必要」「ブログには Article 構造化データが必須」など、ページ種別ごとに要件が異なります。

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
    // ── トップページ: SPAのためブラウザ描画後に検証（Full Mode）
    {
      path: '/',
      mode: 'full',
      waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
      rules: {
        'structured-data': { required: ['WebSite', 'Organization'] },
      },
    },

    // ── ブログ記事: Article 構造化データを必須に
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

    // ── プレビューページ: noindex を意図的に許可
    {
      path: '/preview/**',
      rules: { 'noindex': 'off' },
    },
  ],
});
```

`path` には `**`（任意の深さ）や `*`（単一セグメント）のglobが使えます。

---

## 5. Fast Mode と Full Mode の使い分け

| | Fast Mode（デフォルト） | Full Mode |
|---|---|---|
| 仕組み | HTML を HTTP fetch して cheerio で解析 | Playwright でブラウザを起動してDOM解析 |
| 速度 | 高速（ブラウザ不要） | 低速（起動コスト） |
| 向いている | SSR / 静的サイト / 大量URL | SPA / CSR / ハイドレーション後のDOM |
| 設定 | デフォルト | ページ設定で `mode: 'full'` |

**Full Mode の waitFor 戦略**

SPAでは「描画完了」を待ってから検証する必要があります。

```typescript
pages: [
  // セレクタが現れるまで待つ（最も確実）
  {
    path: '/',
    mode: 'full',
    waitFor: { type: 'selector', selector: 'meta[name="description"][content]' },
  },
  // タイトルが変わるまで待つ
  {
    path: '/dashboard',
    mode: 'full',
    waitFor: { type: 'title', value: /ダッシュボード/ },
  },
  // ネットワークが落ち着くまで待つ
  {
    path: '/heavy-page',
    mode: 'full',
    waitFor: { type: 'networkidle' },
  },
]
```

---

## 6. GitHub Actions に組み込む

### 完全なワークフロー例

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

      # アプリを起動してからSEOテストを実行
      - name: Start dev server
        run: npm run build && npm run preview &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      # CLIで全ページをまとめてチェック
      - name: Run SEO tests (CLI)
        run: |
          npx seo-test \
            --config seo.config.ts \
            --reporter junit \
            --output test-results/seo.xml
        env:
          BASE_URL: http://localhost:3000

      # Playwright マッチャーを使ったE2Eテストも実行
      - name: Run SEO E2E tests
        run: npx playwright test tests/seo/
        env:
          BASE_URL: http://localhost:3000

      # テスト失敗時もXMLをアップロード（CIで結果を確認するため）
      - name: Upload SEO test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: seo-test-results
          path: |
            test-results/seo.xml
            playwright-report/

      # JUnit XMLをGitHub Actions のテスト表示に渡す
      - name: Report test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: SEO Test Results
          path: test-results/seo.xml
          reporter: java-junit
```

### 動作イメージ

```
Pull Request を作成
    │
    ▼
SEO Quality Gate（GitHub Actions）
    │
    ├─ title: "商品一覧 | MyStore" → 13文字 → ❌ FAIL（min: 30）
    ├─ noindex: <meta name="robots" content="noindex"> → ❌ FAIL
    ├─ h1-single: <h1> が 2つ → ❌ FAIL
    │
    └─ exit code 1 → PR のマージをブロック
```

---

## 7. リンク切れチェックを追加する（v1.2）

```typescript
// seo.config.ts
rules: {
  'broken-links': {
    scope: 'internal',   // 内部リンクのみチェック
    severity: 'error',
    timeout: 5000,
    maxConcurrency: 5,
    ignorePatterns: [/\/api\//, /\/admin\//],  // 除外パターン
  },
}
```

または Playwright マッチャーで個別ページを検証：

```typescript
test('リンク切れチェック', async ({ page }) => {
  await page.goto('/');
  await expect.soft(page).toHaveNoInternalBrokenLinks({
    timeout: 5000,
    ignorePatterns: [/mailto:/, /tel:/],
  });
});
```

---

## 8. 構造化データを検証する（v1.1）

```typescript
test('ブログ記事 構造化データ', async ({ page }) => {
  await page.goto('/blog/my-article');

  // Article タイプが存在し、必須フィールドが揃っているか
  await expect.soft(page).toHaveValidStructuredData({ type: 'Article' });
});
```

内部では3段階で検証しています。

| レベル | 内容 | 失敗時 |
|---|---|---|
| L1 | JSON構文が正しいか | `fail` |
| L2 | `@context` と `@type` が存在するか | `fail` |
| L3 | タイプ別の推奨フィールドが揃っているか | `warn` |

---

## 9. よくある質問

### Q: `expect.soft` と通常の `expect` の違いは？

`expect` は最初の失敗で止まります。`expect.soft` は全アサーションを実行してから一括で失敗します。SEOチェックは「全項目を一度に確認したい」ので `expect.soft` が基本です。

### Q: noindex のルールが誤検知する

`/preview/**` のように noindex が正当なページは、ページ設定で `noindex: 'off'` にしてください。

```typescript
pages: [
  { path: '/preview/**', rules: { 'noindex': 'off' } }
]
```

### Q: CJK（日本語・中国語・韓国語）文字は文字数カウントで不利では？

seo-guardian はバイト数ではなく **Unicode コードポイント数**（`[...str].length`）で計測します。日本語1文字 = 1文字としてカウントされます。

### Q: SPA（Next.js / Nuxt / Astro）でも使える？

使えます。`mode: 'full'` と `waitFor` を組み合わせてハイドレーション後のDOMを検証してください。

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

## 次のステップ

- [設定リファレンス](./configuration.md) — 全ルールのオプションと初期値
- [APIリファレンス](./api-reference.md) — 関数シグネチャとPlaywrightマッチャー一覧
- [設計思想](./introduction.md) — なぜ「診断ツール」ではなく「ガードレール」なのか
