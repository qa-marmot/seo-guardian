# APIリファレンス

`@seo-guardian/core` が公開するすべての関数・型・Playwrightマッチャーのリファレンスです。

---

## 設定関数

### `defineSeoConfig(config)`

SEO設定を定義します。型付きの恒等関数で、IDEの補完と型チェックを有効にします。

```typescript
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: 'http://localhost:3000',
  rules: { 'title-length': { min: 30, max: 60, severity: 'error' } },
});
```

**シグネチャ：**

```typescript
function defineSeoConfig(config: SeoConfig): SeoConfig
```

---

### `resolveConfig(config)`

設定にデフォルト値をマージして解決します。プログラムから利用する場合に使います。

```typescript
import { resolveConfig } from '@seo-guardian/core';

const resolved = resolveConfig(myConfig);
// resolved.rules には全ルールのデフォルト値がマージされている
```

**シグネチャ：**

```typescript
function resolveConfig(config: SeoConfig): Required<SeoConfig>
```

---

### `resolvePageRules(config, pagePath)`

特定のページパスに適用されるルールを解決します（ページ別オーバーライドを反映）。

```typescript
const rules = resolvePageRules(resolvedConfig, '/preview/article-1');
// /preview/** の設定が適用されたルールセットが返る
```

**シグネチャ：**

```typescript
function resolvePageRules(
  config: Required<SeoConfig>,
  pagePath: string
): Required<SeoConfig>['rules']
```

---

## Playwrightマッチャー

### `extendExpect(expect)`

Playwright の `expect` にSEOマッチャーを登録します。テストセットアップファイルで1回だけ呼び出してください。

```typescript
// tests/setup.ts
import { expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);
```

または各テストファイルの先頭で：

```typescript
import { test, expect } from '@playwright/test';
import { extendExpect } from '@seo-guardian/core';

extendExpect(expect);
```

---

### マッチャー一覧

すべてのマッチャーは `Page` オブジェクトに対して使います。`expect.soft(page)` との組み合わせを推奨します。

---

#### `toHaveSeoTitle(options?)`

`<title>` タグの存在と文字数を検証します。

```typescript
await expect.soft(page).toHaveSeoTitle();
await expect.soft(page).toHaveSeoTitle({ minLength: 30, maxLength: 60 });
```

| オプション | 型 | デフォルト |
|---|---|---|
| `minLength` | `number` | `30` |
| `maxLength` | `number` | `60` |

失敗メッセージ例：
```
<title> is too short: 12 chars (min: 30). Current value: "My Page"
```

---

#### `toHaveSeoDescription(options?)`

`<meta name="description">` の存在と文字数を検証します。

```typescript
await expect.soft(page).toHaveSeoDescription();
await expect.soft(page).toHaveSeoDescription({ minLength: 70, maxLength: 160 });
```

| オプション | 型 | デフォルト |
|---|---|---|
| `minLength` | `number` | `70` |
| `maxLength` | `number` | `160` |

---

#### `toHaveSingleH1()`

`<h1>` がページに1つだけ存在するか検証します。

```typescript
await expect.soft(page).toHaveSingleH1();
```

失敗メッセージ例：
```
Found 2 <h1> elements, but exactly 1 is required. Values: "製品一覧", "おすすめ製品"
```

---

#### `toHaveCanonical(url?)`

`<link rel="canonical">` の存在を検証します。`url` を指定すると href の値も検証します。

```typescript
// 存在確認のみ
await expect.soft(page).toHaveCanonical();

// 値の一致も検証
await expect.soft(page).toHaveCanonical('https://example.com/page');
```

| 引数 | 型 | 説明 |
|---|---|---|
| `url` | `string?` | 省略可。指定した場合は href の一致を検証 |

---

#### `toHaveNoNoindex()`

noindex ディレクティブが存在しないことを確認します。

```typescript
await expect.soft(page).toHaveNoNoindex();
```

メタタグ（`robots` / `googlebot`）を検出します。HTTPヘッダーの確認は `x-robots-tag` ルールが担当します。

---

#### `toHaveLangAttribute()`

`<html lang="...">` 属性が存在し、空でないことを確認します。

```typescript
await expect.soft(page).toHaveLangAttribute();
```

---

#### `toHaveRequiredOgTags(options?)`

Open Graph 必須タグの存在を確認します。

```typescript
// デフォルト: og:title / og:description / og:url / og:image
await expect.soft(page).toHaveRequiredOgTags();

// カスタムタグリスト
await expect.soft(page).toHaveRequiredOgTags({
  tags: ['og:title', 'og:description', 'og:url', 'og:image', 'og:type'],
});
```

| オプション | 型 | デフォルト |
|---|---|---|
| `tags` | `string[]` | `['og:title','og:description','og:url','og:image']` |

---

#### `toHaveValidImgAlts()`

全 `<img>` 要素の `alt` 属性を検証します。

```typescript
await expect.soft(page).toHaveValidImgAlts();
```

- `alt` なし → 失敗
- `alt="photo.jpg"` のようなファイル名 → 失敗
- `alt=""` → 合格（装飾画像として許容）

失敗メッセージ例：
```
Found 2 img alt issue(s):
  - <img src="/hero.jpg"> is missing alt attribute
  - <img src="/banner.png"> has filename-only alt="banner.png"
```

---

#### `toHaveValidStructuredData(options?)`

`<script type="application/ld+json">` を3段階で検証します。

```typescript
// 構文と @context/@type の存在確認
await expect.soft(page).toHaveValidStructuredData();

// 特定の @type が存在するか + 推奨フィールドの確認
await expect.soft(page).toHaveValidStructuredData({ type: 'Article' });
await expect.soft(page).toHaveValidStructuredData({
  required: ['WebSite', 'Organization'],
});
```

| オプション | 型 | 説明 |
|---|---|---|
| `type` | `string?` | 必須の `@type` 値（単一指定） |
| `required` | `string[]?` | 必須の `@type` 値リスト |

`type` と `required` を同時指定した場合、`type` が先頭に追加されます。

**3段階バリデーション：**

| レベル | 失敗時の status |
|---|---|
| L1: JSON構文 | `fail` |
| L2: @context / @type | `fail` |
| L3: 型別推奨フィールド | `warn`（expect では pass 扱い） |

L3 の `warn` を捕捉したい場合は `expect.soft` を使い、`warn` ステータスのレポートを確認してください。

---

#### `toHaveNoInternalBrokenLinks(options?)`

ページ内の内部リンクをすべてチェックします（ネットワークアクセスあり）。

```typescript
await expect.soft(page).toHaveNoInternalBrokenLinks();
await expect.soft(page).toHaveNoInternalBrokenLinks({
  timeout: 5000,
  maxConcurrency: 3,
  ignorePatterns: [/\/admin\//],
});
```

| オプション | 型 | デフォルト |
|---|---|---|
| `scope` | `'internal'\|'external'\|'all'` | `'internal'` |
| `timeout` | `number` | `5000` |
| `maxConcurrency` | `number` | `5` |
| `ignorePatterns` | `RegExp[]` | `[]` |
| `userAgent` | `string` | `'seo-guardian/0.1'` |

---

## ルール関数（プログラム利用）

Playwright を使わずに、HTML文字列に対してルールを直接実行できます。

### 共通インターフェース

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
result.actual;  // string[] — 実際のh1テキストリスト
```

---

### `checkCanonical(input, options?)`

```typescript
const result = checkCanonical(input, { expectedUrl: 'https://example.com/' });
```

---

### `checkNoindex(input)`

```typescript
// responseHeaders を渡すと X-Robots-Tag も検証
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
result.actual;  // string | null — html[lang] の値
```

---

### `checkOgRequired(input, options?)`

```typescript
const result = checkOgRequired(input, {
  tags: ['og:title', 'og:description', 'og:url', 'og:image'],
});
result.actual;  // Record<string, string> — 存在した og タグ
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
result.actual;  // Record<string, unknown>[] — パースされたJSON-LDオブジェクト
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

非同期。ネットワークアクセスあり。

```typescript
import { checkBrokenLinks } from '@seo-guardian/core';

const result = await checkBrokenLinks(
  { html, url, context: 'static' },
  { scope: 'internal', maxConcurrency: 5 }
);

result.actual;
// { url: string; status: number; sourceSelector: string }[]
// status === 0 はタイムアウト/ネットワークエラー
```

---

### `checkRedirectChain(url, input, options?)`

非同期。ネットワークアクセスあり。他のルールと異なり、第1引数にURLを直接渡します。

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

## エンジン関数

### `runFastMode(html, url, config, pageConfig?, responseHeaders?)`

cheerioベースのFast Modeエンジンを直接実行します。

```typescript
import { runFastMode } from '@seo-guardian/core';

const results = await runFastMode(
  html,
  'https://example.com/',
  myConfig,
  undefined,
  { 'x-robots-tag': 'noindex' }  // レスポンスヘッダー
);

results.forEach((r) => {
  if (r.status === 'fail' && r.severity === 'error') {
    console.error(`[${r.ruleId}] ${r.message}`);
  }
});
```

---

### `fetchAndAnalyze(url, config)`

URLをフェッチしてFast Modeを実行するショートカット。

```typescript
import { fetchAndAnalyze } from '@seo-guardian/core';

const results = await fetchAndAnalyze('https://example.com/', config);
```

---

## 型定義

```typescript
// 重大度
type Severity = 'error' | 'warning' | 'info';

// ルール実行結果の共通型
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

// ルール別の型エイリアス
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

// 設定
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

すべての型は named export で提供されています。

```typescript
import type { TestResult, SeoConfig, WaitForStrategy } from '@seo-guardian/core';
```
