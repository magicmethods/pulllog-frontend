# PullLog Frontend

個人のガチャ履歴を記録・管理するWebアプリ「PullLog」のフロントエンドリポジトリです。  
本アプリはNuxt.js 3 + PrimeVue 4 + Pinia 3 + TailwindCSS 4 + TypeScript + Luxon + Chart.jsを中心技術として構築されています。

## デモ・スクリーンショット

（※適宜スクリーンショット画像を追加）

---

## 目次

- [主な特徴](#主な特徴)
- [技術スタック](#技術スタック)
- [セットアップ方法](#セットアップ方法)
- [ディレクトリ構成](#ディレクトリ構成)
- [主要な設計・開発指針](#主要な設計開発指針)
- [ストア責務分離方針](#ストア責務分離方針)
- [コーディング規約](#コーディング規約)
- [開発・運用Tips](#開発運用tips)
- [ライセンス](#ライセンス)
- [コントリビューション](#コントリビューション)
- [関連リンク](#関連リンク)

---

## 主な特徴

- 個人のガチャ履歴（タイトル・日付・回数・最高レア・課金額・タグ等）を直感的UIで登録・管理
- PrimeVueベースの快適なUI/UX
- Luxonを用いたタイムゾーン対応
- Chart.jsによる可視化グラフ（回数推移・課金推移など）
- ピンポイントキャッシュや最適化済みPiniaストア
- Zodを使った型安全なフォームバリデーション
- SCSSによる柔軟なカスタムスタイリング
- テーマ切り替え（ダーク／ライト）機能
- 認証付き・API連携（詳細はサーバーリポジトリ参照）

---

## 技術スタック

- **フレームワーク**: Nuxt.js v3.16.2
- **UIフレームワーク**: PrimeVue v4.3.3
- **状態管理**: Pinia v3.0.2
- **スタイル**: TailwindCSS v4.1.4, SCSS
- **言語**: TypeScript
- **日付管理**: Luxon
- **グラフ描画**: Chart.js
- **バリデーション**: Zod
- **パッケージ管理**: pnpm
- **API通信**: fetch（useFetchは非推奨）
- **その他**: ESLint, Prettier, Biomeなど

---

## セットアップ方法

### 1. 必須環境

- Node.js (v20推奨)
- pnpm

### 2. インストール

```sh
pnpm install
```

### 3. 開発サーバ起動

```sh
pnpm run dev
```

- `http://localhost:3000` でアプリが起動します
- APIバックエンド（pullog-api等）も別途起動しておいてください

### 4. 本番ビルド

```sh
pnpm run build
pnpm run preview
```

---

## ディレクトリ構成

※主要部分抜粋

```plaintext
/
├── components/         # Vueコンポーネント群
├── composables/        # カスタムフック・共通ロジック
├── layouts/            # レイアウトファイル
├── middleware/         # ミドルウェア（認証ガード等）
├── pages/              # ルーティング単位Vue
├── public/             # 静的ファイル（画像・Markdown等）
├── stores/             # Piniaストア定義
│    ├── globalStore.ts
│    ├── useUserStore.ts
│    ├── useAppStore.ts
│    ├── useLogStore.ts
│    ├── useStatsStore.ts
│    ├── useOptionStore.ts
│    ├── useCsrfStore.ts
│    └── useLoaderStore.ts
├── types/              # 型定義
├── utils/              # 共通ユーティリティ
├── assets/             # SCSS/画像
├── app.config.ts       # Nuxtアプリ設定
├── tailwind.config.ts  # TailwindCSS設定
├── nuxt.config.ts      # Nuxt設定
└── README.md           # このファイル
```

---

## 主要な設計・開発指針

- **ストアの責務分離**
各ストアは以下の責務を担います（詳細は各ファイルコメント参照）
  - `useUserStore`: ユーザー認証・情報管理
  - `useAppStore`: アプリケーション情報
  - `useLogStore`: ガチャ履歴ログ取得・キャッシュ
  - `useStatsStore`: 統計値管理・計算
  - `useOptionStore`: ユーザー設定・選択肢
  - `useCsrfStore`: CSRFトークン管理
  - `useLoaderStore`: グローバルローディング状態管理
  - `globalStore`: 他で使わないグローバルな値の一時保持
- **型安全**
すべてTypeScriptで実装、`any` や非nullアサーション（`!`）は（原則）禁止。型定義は `types/` へ集約。
- **日付管理**
Luxonを利用し、全てISO8601文字列またはDate型で厳密管理。
- **グラフ**
Chart.jsを直接ラップした共通コンポーネントを用意し、テーマ切り替え時もリアルタイム反映。
- **フォームバリデーション**
PrimeVueのFormは使用せず、Zodによるバリデーションのみ使用。
- **SCSSスタイル**
`assets/styles` 配下にSCSSで記述。TailwindCSSで基本設計し、細かい上書きはSCSSで。

---

## ストア責務分離方針

- **状態管理の粒度：**
1つのストアに複数の責務を持たせず、担当範囲を限定
- **キャッシュ制御：**
不要なキャッシュは必ず破棄。エラー時や未取得データはキャッシュしない（特に空配列キャッシュに注意）。
- **再利用性・テスタビリティ：**
ロジックはPiniaストアかcomposablesに集約し、VueコンポーネントはUIに専念させる

---

## コーディング規約

- インデントは**スペース4つ**
- セミコロンは原則**不要**
- 非nullアサーション（`!`）は禁止
- 型安全最優先。`any`は原則禁止
- SCSSまたはTailwindでスタイル
- composable/コンポーネントにはTypeDoc準拠のJSDocコメント推奨
- API通信にはfetch（useFetchは不使用）

---

## 開発・運用Tips

- APIエンドポイント定義は `utils/endpoints.ts` で一元管理
- テーマ/ロケール等の設定値は `useOptionStore` およびローカルストレージに保存
- テーマ切り替え時の遅延はグローバルCSSに `transition: none !important` を一時的に付与することで解消
- マークダウンファイルをfetchで取得する場合は `public/` 配下に配置
- エラー画面カスタマイズは `layouts/error.vue` で対応（Nuxtのデフォルトと競合する場合は注意）
- コミット前に必ず `pnpm run lint` を実行

---

## ライセンス

MAGIC METHODS に帰属します。

---

## コントリビューション

関係各位のPull Request・Issue歓迎です。
設計や方針の議論はDiscussionsまたはIssueで行ってください。

---

## 関連リンク

- [PullLog バックエンドリポジトリ](https://github.com/magicmethods/pulllog-backend)
- [PullLog API仕様書](https://github.com/magicmethods/pulllog-contract)
- ドキュメント
  - [利用規約（日本語）](https://raw.githubusercontent.com/magicmethods/pulllog-frontend/refs/heads/main/public/docs/terms_ja.md)
  - [利用規約（English）](https://raw.githubusercontent.com/magicmethods/pulllog-frontend/refs/heads/main/public/docs/terms_en.md)
  - [プライバシーポリシー（日本語）](https://raw.githubusercontent.com/magicmethods/pulllog-frontend/refs/heads/main/public/docs/privacy_policy_ja.md)
  - [プライバシーポリシー（English）](https://raw.githubusercontent.com/magicmethods/pulllog-frontend/refs/heads/main/public/docs/privacy_policy_en.md)

---

**（補足）**
運用や設計方針の見直しは適宜Issue/PRで反映していきます。最新情報はGitHubリポジトリおよび本READMEを参照してください。
