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
