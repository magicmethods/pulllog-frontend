背景
- ランディングページに OGP/Twitter Card 等のメタタグを追加し、各言語で最適化された内容を出力する。

目的
- 共有時の表示最適化と検索・SNSでのクリック率向上。多言語に対応したタイトル/説明/URL/画像/ロケールを提供。

対象
- pages/index.vue（ランディングページ）

スコープ（実装）
- Nuxt 3 の useSeoMeta + useHead で OGP/Twitter/canonical/hreflang を出力
- i18n/locales/{ja,en,zh}.ts に seo.index.title / seo.index.description を追加
- nuxt.config.ts に runtimeConfig.public.siteUrl を追加（本番: https://pulllog.net）
- app.config.ts に siteName / defaultOgImage / twitterHandle を追加（defaultOgImage: /images/og_default.jpg、twitterHandle: @PullLog）
- types/seo.ts を新規作成（ロケール変換マップ・入力型）
- composables/useSeoOg.ts を新規作成（絶対URL生成、ロケール変換、タグ生成を集約）
- pages/index.vue で useSeoOg({ title, description, imagePath? }) を呼び出し
- og:locale と og:locale:alternate を自動設定（ja_JP / en_US / zh）
- link[rel=alternate][hreflang] を ja|en|zh|x-default で出力
- Twitter: summary_large_image、twitter:site、twitter:title、twitter:description、twitter:image
- 既定OG画像: public/images/og_default.jpg（1200x630）

非機能・規約準拠
- TypeScript（4スペース・セミコロン省略）、any禁止、非nullアサーション禁止、JSDoc付与、fetch使用

動作確認
- pnpm build && pnpm preview で各言語切替時のメタ出力を確認
- canonical/hreflang/og:*/twitter:* が期待通りであること
- OGPデバッガ（Facebook/Twitter/X/LinkedIn）でプレビューOK（本番URL）

要確認事項（確定済み）
- 本番ドメイン: https://pulllog.net
- 既定OG画像パス: /images/og_default.jpg（1200x630）
- X（Twitter）ハンドル: @PullLog
- 中国語ロケール: 単一 zh

受け入れ基準（DoD）
- 各言語でタイトル/説明/URL/画像/ロケールが正しく切替
- pnpm build が成功し、プレビューでメタが確認可能
- コーディング規約・禁止事項に準拠（JSDoc あり）
- 手動確認手順をPRに記載
