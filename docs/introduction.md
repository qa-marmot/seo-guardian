# seo-guardian とは

> **「SEOを、コードで守る」**  
> デプロイのたびに手動確認していませんか？ seo-guardian は、SEO要件を自動テストとして定義し、CI/CDパイプラインで強制的に検証します。

---

## 誰のためのツールか

| こんな経験はありませんか | seo-guardian が解決します |
|---|---|
| 本番に noindex を出してしまった | CIでデプロイをブロック |
| リリース後に og:image の設定漏れを発見 | PR段階で自動検知 |
| タイトルタグが60文字を大幅に超えていた | 文字数ルールをコードで強制 |
| 担当者が変わるたびにSEO知識がリセットされる | ルールをコードで文書化 |
| Lighthouseを毎回手動で回している | CI上で常時自動実行 |

このツールは、石川県の制作チーム「**つくるところweb**」が実際のWeb制作現場で感じた課題から生まれました。Webエンジニアが「今日から自分のプロジェクトに入れられる」ことを最優先に設計しています。

---

## 診断ツールとの違い

seo-guardian は Lighthouse や Google Search Console とは**役割が異なります**。

```
Lighthouse / Search Console
    役割: 健康診断（問題を可視化・スコアリング）
    タイミング: デプロイ後に手動確認
    失敗時: レポートを見て手動対応

seo-guardian
    役割: ガードレール（デプロイ可否の判定）
    タイミング: PR作成時・CI実行時に自動
    失敗時: exit code 1 でデプロイをブロック
```

両者は補完関係にあります。seo-guardian で「最低限を自動保証」し、Lighthouse で「品質をさらに高める」という使い方が理想です。

---

## 設計の3原則

### 1. Fail Fast — 最速で失敗する

SEO問題はデプロイ前に発見するほどコストが低い。seo-guardian はPRの段階でブロックするよう設計されています。`severity: 'error'` のルール違反は、CI全体を失敗させます。

### 2. ハイブリッド実行 — 速さと正確さの両立

```
Fast Mode（デフォルト）
    cheerio による静的HTML解析
    ブラウザ不要 → 高速
    SSR/静的サイトに最適

Full Mode
    Playwright によるブラウザ描画後の解析
    SPA・CSRサイトに対応
    waitFor 戦略でハイドレーション完了を待つ
```

「速度が必要なCI」ではFast Modeで全ページをまとめてチェックし、「正確性が必要な重要ページ」のみFull Modeを使うのが推奨パターンです。

### 3. 設定はコード — ルールを文書化する

`seo.config.ts` は TypeScript で書かれた設定ファイルです。IDEの補完が効き、型チェックも通ります。「なぜこのルールがあるか」をコメントで残せるため、チーム内のSEO知識を継続的に文書化できます。

```typescript
export default defineSeoConfig({
  rules: {
    // 検索結果での表示文字数に合わせた制限
    'title-length': { min: 30, max: 60, severity: 'error' },

    // /preview/ 配下はステージング確認のためnoindexが必要
    // 本番と同じルールを適用しない
    'noindex': 'error',
  },
  pages: [
    { path: '/preview/**', rules: { 'noindex': 'off' } },
  ],
});
```

---

## アーキテクチャ概要

```
CI/CD Pipeline
    │
    ├─ CLI (npx seo-test)          ← コマンドラインから実行
    ├─ Playwright テスト           ← E2Eテストスイートに組み込み
    └─ seo.config.ts               ← 設定ファイル
         │
         ▼
    Hybrid Engine
    ├─ Fast Mode: cheerio + HTTP fetch    （デフォルト）
    └─ Full Mode: Playwright + waitFor   （mode: 'full' 指定時）
         │
         ▼
    Rule Engine（12ルール）
    ├─ MVP:  title / description / h1 / canonical / noindex / lang / og-required / img-alt
    ├─ v1.1: structured-data / hreflang / robots-txt / x-robots-tag
    └─ v1.2: broken-links / redirect-chain
         │
         ▼
    Reporter
    ├─ Terminal（カラー表示）
    ├─ JUnit XML（CI向け）
    └─ JSON（プログラム処理向け）
```

---

## TestResult 型 — すべての結果の共通形式

すべてのルールは `TestResult<A, E>` 型を返します。

```typescript
type TestResult<A = unknown, E = unknown> = {
  ruleId: string;        // 'title-length' など
  status: 'pass' | 'fail' | 'warn';
  severity: 'error' | 'warning' | 'info';
  actual: A;             // 実際の値（ルールごとに型が異なる）
  expected: E;           // 期待値
  selector?: string;     // 問題のあったCSSセレクター
  message: string;       // 人間が読めるエラーメッセージ
  context: 'static' | 'rendered';
  url: string;
  duration?: number;     // 実行時間（ms）
  helpUrl?: string;      // Googleドキュメントへのリンク
};
```

`severity: 'error'` のルールが `status: 'fail'` になったとき、CIが失敗します。`severity: 'warning'` はレポートには表示されますがCIは通過します。

---

## 次のステップ

- [チュートリアル](./tutorial.md) — 5分で最初のテストを動かす
- [設定リファレンス](./configuration.md) — 全ルールのオプション詳細
- [APIリファレンス](./api-reference.md) — 関数・マッチャー一覧
