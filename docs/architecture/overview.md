# フロントエンド アーキテクチャ概要

## 1. 目的

この文書は、PullLog フロントエンドの**現行アーキテクチャ全体像**を素早く把握するための概要です。  
詳細な E2E 運用は `docs/architecture/e2e-test.md`、ビルド / デプロイは `docs/operations/deploy-and-build.md` を参照してください。

---

## 2. システム全体構成

PullLog フロントエンドは **Nuxt 3 SSR** を中心に構成され、配備先は **Cloudflare Workers**、バックエンド連携は **Nitro プロキシ** を介して行います。

```text
Browser
  → Nuxt 3 SSR
    → Nitro server/api proxy
      → Laravel API
        → Database / Storage
```

### 基本方針

- ブラウザからバックエンド API へ**直接アクセスしない**
- API 呼び出しは `fetch` + `api/endpoints.ts` 経由に統一する
- `SECRET_API_KEY` のような秘密情報は **server-side only** として扱う
- API 契約の正本は `../contract/api-schema.yaml` を参照する

---

## 3. 実行モード

| モード | 用途 | 主な入口 |
|---|---|---|
| ローカル開発 | 日常開発・画面確認 | `pnpm dev` |
| ローカル本番確認 | ビルド済み動作確認 | `pnpm build` → `pnpm preview` |
| E2E 検証 | Playwright による主要フロー確認 | `pnpm run test:e2e*` |
| 本番配備 | Cloudflare Workers へデプロイ | `pnpm wrangler_deploy` |

ローカル開発では HTTPS 証明書として `public/localhost.pem` / `public/localhost-key.pem` を利用し、既定ホストは `https://pull.log:4649` です。

---

## 4. ディレクトリ構成

| ディレクトリ / ファイル | 役割 |
|---|---|
| `pages/` | ルート駆動の画面コンポーネント |
| `layouts/` | 画面レイアウト (`default`, `auth`, `landing`, `error`) |
| `components/` | 再利用 UI コンポーネント |
| `composables/` | 再利用ロジック (`useXxx.ts`) |
| `stores/` | Pinia ストア |
| `server/api/` | Nitro API ルート / バックエンドプロキシ |
| `server/middleware/` | Nitro ミドルウェア |
| `middleware/` | Nuxt グローバルミドルウェア |
| `api/endpoints.ts` | REST エンドポイント定義の一元管理 |
| `config/` / `app.config.ts` | アプリ設定の読込 |
| `theme/` | PrimeVue テーマ / PassThrough 設定 |
| `i18n/locales/` | 翻訳辞書 |
| `tests/e2e/` | Playwright E2E 実装本体 |
| `tests/playwright/` | Playwright 設定 / reporter |
| `e2e/cases/` | manifest-driven E2E ケース定義 |
| `e2e/templates/` | Markdown / PDF evidence テンプレート |
| `docs/` | 長期保存向け設計・運用ドキュメント |

---

## 5. 画面ルーティング

Nuxt のファイルシステムルーティングを採用しています。

| パス | ファイル | 概要 |
|---|---|---|
| `/` | `pages/index.vue` | ランディングページ |
| `/:lang` | `pages/[lang].vue` | 言語別トップ |
| `/apps` | `pages/apps.vue` | アプリ一覧 |
| `/history` | `pages/history.vue` | 履歴管理 |
| `/stats` | `pages/stats.vue` | 統計表示 |
| `/settings` | `pages/settings.vue` | ユーザー設定 |
| `/auth/*` | `pages/auth/` | ログイン / 登録 / 認証関連 |
| `/error/*` | `pages/error/` | エラー画面 |

### レイアウト

| レイアウト | 主な用途 |
|---|---|
| `default.vue` | 認証後の通常画面 |
| `auth.vue` | ログイン / 登録画面 |
| `landing.vue` | 非ログイン向けトップ |
| `error.vue` | エラー表示 |

---

## 6. 状態管理（Pinia）

主要ストアは責務ごとに分離されています。

| ストア | 主な責務 |
|---|---|
| `useUserStore` | 認証・ユーザー情報 |
| `useAppStore` | アプリ一覧 / 選択状態 |
| `useLogStore` | 履歴データの取得・保持 |
| `useStatsStore` | 統計データ |
| `useStatsLayoutStore` | 統計表示レイアウト |
| `useOptionStore` | ユーザー設定 |
| `useCsrfStore` | CSRF トークン |
| `useLoaderStore` | グローバルローディング状態 |
| `useCurrencyStore` | 通貨データ |
| `useFeatureFlagStore` | feature flag |
| `globalStore` | 一時的な共有値 |

### ストア設計方針

- キャッシュは必要最小限にする
- エラー状態や空レスポンスを無制限に保持しない
- 画面固有ロジックはコンポーネントへ、横断ロジックは composable / store へ寄せる

---

## 7. API 通信方針

### エンドポイント管理

全 REST エンドポイント URL は `api/endpoints.ts` に集約しています。  
画面や composable 側で URL 文字列を直書きしない方針です。

### リクエストの流れ

1. ブラウザ側が `fetch(endpoints.xxx())` を呼ぶ
2. Nitro (`server/api/`) がバックエンド API へ中継する
3. 必要に応じて `SECRET_API_KEY` や認証関連ヘッダを付与する
4. レスポンスを UI に返す

### 認証 / セキュリティ

- API 通信は **`fetch` を使用**し、`useFetch` は使わない
- CSRF トークンは `useCsrfStore` で管理する
- 認証切れ時は refresh / retry を考慮する
- 追加 / 変更する API は必ず `../contract/api-schema.yaml` と整合させる

### 主な composable

| composable | 役割 |
|---|---|
| `useAPI` | API 共通ラッパー、エラーハンドリング、CSRF 再試行 |
| `useAuth` | ログイン / ログアウト / セッション管理 |
| `useGoogleAuth` | Google OAuth フロー |
| `usePkce` | PKCE 補助 |

---

## 8. Nuxt / Middleware / Config

### グローバルミドルウェア

| ファイル | 役割 |
|---|---|
| `middleware/auth.global.ts` | 未認証時のアクセス制御 |
| `middleware/currency.global.ts` | 通貨データの初期ロード |

### 設定読込

- `nuxt.config.ts` で runtimeConfig / Nitro / Vite / i18n / PrimeVue を設定
- `app.config.ts` は `config/settings.json` を読み込み、アプリ共通設定を注入
- 環境差分は主に `.env.local` / `.env.production` / `.env.e2e` で切り替える

---

## 9. i18n / UI / スタイリング

### 国際化

- `@nuxtjs/i18n` を利用
- ロケールは `ja` / `en` / `zh`
- 翻訳ファイルは `i18n/locales/*.ts`
- デフォルトロケールは `runtimeConfig.public.defaultLocale`

### スタイリング原則

1. **TailwindCSS v4** を優先
2. 補助的なスタイルは `assets/styles/` に集約
3. PrimeVue の見た目調整は `theme/` の preset / ptPreset で管理
4. コンポーネント個別 CSS は必要最小限にとどめる

---

## 10. テスト / E2E アーキテクチャ

フロントエンドの主要 E2E は **manifest-driven** です。

| パス | 役割 |
|---|---|
| `e2e/cases/*.json` | ケース定義の正本 |
| `tests/e2e/core-flows.spec.ts` | 現行の主要フロー実装 |
| `tests/e2e/pages/` | page object |
| `tests/e2e/support/` | 共通 helper / scenario support |
| `tests/playwright/playwright.config.ts` | 実行設定 |
| `tests/playwright/reporters/` | Markdown レポート生成 |

### 標準マトリクス

- PC: `chromium`
- Tablet: `ipad-pro-11`
- SP: `iphone-14`

レポートは `e2e/reports/YYYY-MM-DD/<case-id>/report.md` に集約され、成功時は `pnpm run test:e2e:pdf -- <report.md>` で PDF evidence を生成できます。  
詳細な運用は `docs/architecture/e2e-test.md` を参照してください。

---

## 11. ビルド / 配備

- Nuxt + Vite によりビルド
- `manualChunks` で PrimeVue / Chart / Luxon / i18n 系を分割し、初期ロードを最適化
- 配備先は Cloudflare Workers（`nitro.preset = "cloudflare_module"`）

主なコマンド:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm wrangler_preview
pnpm wrangler_deploy
```

---

## 12. 主要な環境変数

| 変数名 | 用途 | 公開範囲 |
|---|---|---|
| `API_BASE_URL` | バックエンド API ベース URL | Server / Public runtime |
| `API_PROXY` | フロント側 API プロキシパス | Server / Public runtime |
| `SECRET_API_KEY` | バックエンド接続用秘密鍵 | Server only |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID | Public |
| `APP_NAME` / `APP_VERSION` | 表示用メタ情報 | Public |
| `DEFAULT_LOCALE` | デフォルト言語 | Public |
| `MOCK_MODE` | モック切り替え | Public |
| `USE_FEATURE_FLAG` / `NEW_FEATURES` | 機能フラグ制御 | Public |

---

## 13. 関連ドキュメント

- `docs/README.md`
- `docs/architecture/e2e-test.md`
- `docs/operations/deploy-and-build.md`
- `docs/features/gallery/implementation-plan.md`
- `../contract/api-schema.yaml`（API 契約の正本）
