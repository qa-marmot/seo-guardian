# 設定リファレンス

`seo.config.ts` の全オプションを解説します。

---

## 基本構造

```typescript
import { defineSeoConfig } from '@seo-guardian/core';

export default defineSeoConfig({
  baseUrl: 'http://localhost:3000',   // 必須
  rules: { /* ... */ },              // 省略可（デフォルト値あり）
  pages: [ /* ... */ ],              // 省略可
  discovery: { /* ... */ },          // 省略可
});
```

---

## `baseUrl`

テスト対象のベースURL。CLIの `--base-url` オプションで上書きできます。

```typescript
baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
```

---

## `rules` — ルール設定

### 設定形式

各ルールは以下の3種類の形式で指定できます。

```typescript
rules: {
  // 形式1: ショートハンド文字列
  'img-alt': 'error',        // 有効化（error として扱う）
  'hreflang': 'off',         // 無効化

  // 形式2: オブジェクト（詳細設定）
  'title-length': { min: 30, max: 60, severity: 'error' },

  // 形式3: ページ設定内でのオーバーライド（後述）
}
```

### severity の意味

| 値 | 動作 |
|---|---|
| `'error'` | 失敗時にCIを失敗させる（exit code 1） |
| `'warning'` | レポートに表示するがCIは通過する |
| `'info'` | 情報として記録するのみ |
| `'off'` | ルールを無効化する |

---

## ルール一覧とデフォルト値

### MVP ルール（デフォルト有効）

#### `title-length`

`<title>` タグの存在と文字数を検証します。

```typescript
'title-length': { min: 30, max: 60, severity: 'error' }
```

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `min` | `number` | `30` | 最小文字数 |
| `max` | `number` | `60` | 最大文字数 |
| `severity` | `Severity` | `'error'` | 失敗時の重大度 |

- 文字数は **Unicodeコードポイント数**（CJK文字も1文字）
- タグが存在しない場合も `fail`

---

#### `description-length`

`<meta name="description">` の存在と文字数を検証します。

```typescript
'description-length': { min: 70, max: 160, severity: 'error' }
```

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `min` | `number` | `70` | 最小文字数 |
| `max` | `number` | `160` | 最大文字数 |
| `severity` | `Severity` | `'error'` | 失敗時の重大度 |

---

#### `h1-single`

`<h1>` 要素がページに1つだけ存在するか検証します。

```typescript
'h1-single': 'error'
```

- 0個 → `fail`（missing）
- 2個以上 → `fail`（duplicate、全テキストを表示）
- ネストした `<h1>` も検出対象

---

#### `canonical`

`<link rel="canonical">` の存在と href を検証します。

```typescript
'canonical': 'error'
```

- タグが存在しない → `fail`
- `href` が空 → `fail`
- ページ設定で `expectedUrl` を指定すると値の一致も検証

---

#### `noindex`

noindex ディレクティブが設定されていないか検証します。

```typescript
'noindex': 'error'
```

検出対象：
- `<meta name="robots" content="noindex,...">` （大文字小文字を問わない）
- `<meta name="googlebot" content="noindex,...">`
- `X-Robots-Tag: noindex` レスポンスヘッダー

プレビューページなど意図的なnoindexは `pages` でオーバーライドしてください。

```typescript
pages: [{ path: '/preview/**', rules: { 'noindex': 'off' } }]
```

---

#### `lang`

`<html lang="">` 属性の存在を検証します。

```typescript
'lang': 'error'
```

- 属性自体がない → `fail`
- 空文字または空白のみ → `fail`
- `"en"` `"ja"` `"en-US"` などの値があれば `pass`（BCP47の妥当性検証は hreflang ルールが担当）

---

#### `og-required`

Open Graph 必須タグの存在を検証します。

```typescript
'og-required': 'error'
// または詳細設定
'og-required': {
  tags: ['og:title', 'og:description', 'og:url', 'og:image'],
  severity: 'error',
}
```

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `tags` | `string[]` | `['og:title','og:description','og:url','og:image']` | 必須タグのリスト |
| `severity` | `Severity` | `'error'` | 失敗時の重大度 |

- content が空文字・空白のみのタグは「存在しない」と判定

---

#### `img-alt`

全 `<img>` 要素の `alt` 属性を検証します。

```typescript
'img-alt': 'error'
```

| 状態 | 判定 |
|---|---|
| `alt` 属性なし | `fail`（missing） |
| `alt=""` | `pass`（装飾画像として許容） |
| `alt="photo.jpg"` のようなファイル名 | `fail`（filename-only） |
| `alt="山頂からの眺め"` | `pass` |

---

### v1.1 ルール

#### `structured-data`

`<script type="application/ld+json">` の検証（3段階）。

```typescript
'structured-data': 'warning'
// または詳細設定
'structured-data': {
  required: ['WebSite', 'Organization'],  // 必須の @type 値
  severity: 'warning',
}
```

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `required` | `string[]` | `[]` | ページに必須の `@type` 値リスト |
| `severity` | `Severity` | `'warning'` | 失敗時の重大度 |

**3段階バリデーション：**

| レベル | 内容 | 結果 |
|---|---|---|
| L1 | JSONとして有効か | 失敗 → `fail` |
| L2 | `@context`（schema.org）と `@type` が存在するか | 失敗 → `fail` |
| L3 | 型別の推奨フィールドが揃っているか | 失敗 → `warn` |

L3 で対応している型：`WebSite` `Organization` `Person` `Article` `BlogPosting` `Product` `BreadcrumbList` `FAQPage` `LocalBusiness` `Event` `Recipe` `VideoObject` `ImageObject` `WebPage` `SoftwareApplication`

---

#### `hreflang`

多言語サイトの `<link rel="alternate" hreflang="...">` を検証します。

```typescript
'hreflang': 'off'  // デフォルト無効
// 多言語サイトでは有効化
'hreflang': 'warning'
```

検証内容：
- hreflang 値が BCP 47 形式か（`en` `ja` `zh-TW` `x-default` など）
- `href` が空でないか
- 複数の alternate が存在する場合 `x-default` があるか
- 同一 hreflang 値の重複がないか

---

#### `robots-txt`

`/robots.txt` の存在と内容を検証します（ネットワークアクセスあり）。

```typescript
'robots-txt': 'warning'
```

検証内容：
- HTTP 200 で取得できるか（取得失敗 → `fail`）
- `Disallow: /` が全ユーザーエージェントに設定されていないか（→ `fail`）
- `Sitemap:` ディレクティブが存在するか（なければ → `warn`）

---

#### `x-robots-tag`

HTTP レスポンスヘッダー `X-Robots-Tag` を検証します。

```typescript
'x-robots-tag': 'warning'
```

| ヘッダー値 | 判定 |
|---|---|
| なし / `index` / `follow` | `pass` |
| `noindex` | `fail` |
| `nosnippet` / `unavailable_after` / `none` | `warn` |

HTMLの `<meta name="robots">` とは独立して動作します。CDN・プロキシ設定によるサーバーレベルのnoindexを検出するために使います。

---

### v1.2 ルール

#### `broken-links`

ページ内のリンクをチェックします（ネットワークアクセスあり）。

```typescript
'broken-links': 'warning'  // デフォルト warning（無効ではない）
// または詳細設定
'broken-links': {
  scope: 'internal',           // 'internal' | 'external' | 'all'
  severity: 'error',
  externalScope: 'warning',
  timeout: 5000,               // ms
  maxConcurrency: 5,           // 並列リクエスト数
  ignorePatterns: [/\/api\//], // 除外パターン
  userAgent: 'my-bot/1.0',
}
```

| オプション | 型 | デフォルト | 説明 |
|---|---|---|---|
| `scope` | `'internal'\|'external'\|'all'` | `'internal'` | チェック対象の範囲 |
| `timeout` | `number` | `5000` | リクエストタイムアウト（ms） |
| `maxConcurrency` | `number` | `5` | 最大並列リクエスト数 |
| `ignorePatterns` | `RegExp[]` | `[]` | 除外するhrefパターン |
| `userAgent` | `string` | `'seo-guardian/0.1'` | User-Agent ヘッダー |

デフォルト除外パターン：`mailto:` `tel:` `javascript:` `#` `data:`

**スコープと失敗時の挙動：**
- 内部リンク切れ → `fail`
- 外部リンク切れ（scope が `'internal'` の場合） → チェックしない
- 外部リンク切れ（scope が `'external'` / `'all'` の場合） → `fail`

---

## `pages` — ページ別設定

### 基本構造

```typescript
pages: [
  {
    path: '/blog/**',          // glob パターン
    mode: 'fast',              // 'fast' | 'full'（省略時: 'fast'）
    waitFor: { /* ... */ },    // Full Mode 時の待機戦略
    rules: { /* ... */ },      // このパスに適用するルール上書き
  },
]
```

### `path` — globパターン

| パターン | マッチ例 |
|---|---|
| `/` | トップページのみ |
| `/blog/*` | `/blog/article-1`（1階層のみ） |
| `/blog/**` | `/blog/2024/01/post`（任意の深さ） |
| `/preview/**` | `/preview/any/path` |

### `mode`

```typescript
{ path: '/app/**', mode: 'full' }
```

### `waitFor` — Full Mode の待機戦略

```typescript
// セレクタが DOM に現れるまで待つ
{ type: 'selector', selector: 'meta[name="description"][content]' }

// タイトルが特定の値になるまで待つ
{ type: 'title', value: 'ホーム | MySite' }
{ type: 'title', value: /ホーム/ }  // 正規表現も可

// ネットワークが落ち着くまで待つ
{ type: 'networkidle' }

// ページロード完了まで待つ
{ type: 'load' }
```

### ルール上書きの優先順位

```
ページ設定の rules > グローバル rules > デフォルト値
```

---

## `discovery` — URL発見設定

CLIで実行するとき、どのURLをテストするかを設定します。

### 形式1: リスト指定

```typescript
discovery: {
  type: 'list',
  urls: ['/', '/about', '/blog', '/contact'],
}
```

### 形式2: サイトマップから取得

```typescript
discovery: {
  type: 'sitemap',
  url: '/sitemap.xml',    // 絶対URL または baseUrl からの相対パス
  limit: 50,              // 最大取得件数（省略時: 全件）
}
```

### 形式3: クロール開始点

```typescript
discovery: {
  type: 'crawl',
  startUrl: '/',
  limit: 100,
}
```

---

## 全デフォルト値一覧

```typescript
// src/config.ts より
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
  'hreflang':           'off',       // 多言語サイトのみ有効化
  'robots-txt':         'warning',
  'x-robots-tag':       'warning',
  'broken-links':       'warning',
};
```

`discovery` のデフォルトは `{ type: 'list', urls: ['/'] }`（トップページのみ）です。
