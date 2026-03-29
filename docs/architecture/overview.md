# フロントエンド アーキテクチャ概要

## システム全体構成

PullLog フロントエンドは **Nuxt 3 SSR + Cloudflare Workers** で構成され、バックエンド API（Laravel 12 / VPS）との通信は Nitro サーバが担うプロキシ層を経由する。

```
ブラウザ
  └─→ Nuxt 3 SSR (Cloudflare Workers)
         └─→ Nitro API Proxy (server/api/)
                └─→ Laravel API (VPS: api.pulllog.net)
                       └─→ PostgreSQL 14
```

クライアントからバックエンドへの直接リクエストは行わず、すべて Nitro プロキシ経由で転送する。これにより `SECRET_API_KEY` をクライアントへ露出させずに済む。

---

## ディレクトリ構成

| ディレクトリ | 役割 |
|---|---|
| `pages/` | ルート駆動の画面コンポーネント |
| `layouts/` | 画面枠テンプレート（`default`, `auth`, `landing`, `error`） |
| `components/` | 再利用可能な UI コンポーネント（PrimeVue Auto-Import） |
| `composables/` | 再利用可能なロジック (`useXxx.ts`) |
| `stores/` | Pinia ストア（責務別） |
| `server/api/` | Nitro API ルート（バックエンドへのプロキシ） |
| `server/middleware/` | Nitro ミドルウェア |
| `api/endpoints.ts` | REST エンドポイント URL 定義の一元管理 |
| `types/` | グローバル型定義 |
| `i18n/locales/` | 翻訳ファイル（`ja.ts`, `en.ts`, `zh.ts`） |
| `assets/styles/` | TailwindCSS / SCSS グローバルスタイル |
| `theme/` | PrimeVue テーマ定義（`preset.ts`, `ptPreset.ts`） |
| `config/` | アプリ共通設定 |
| `directives/` | カスタム Vue ディレクティブ |
| `public/` | 静的アセット / 証明書 / ドキュメント |
| `docs/` | 開発・運用ドキュメント（gitignore 対象外） |

---

## ルーティング

Nuxt のファイルシステムルーティングを採用。

| パス | ファイル | 概要 |
|---|---|---|
| `/` | `pages/index.vue` | トップ（ランディング） |
| `/:lang` | `pages/[lang].vue` | 言語別トップ |
| `/apps` | `pages/apps.vue` | アプリ（タイトル）一覧 |
| `/history` | `pages/history.vue` | ガチャ履歴 |
| `/stats` | `pages/stats.vue` | 統計 |
| `/settings` | `pages/settings.vue` | ユーザー設定 |
| `/auth/*` | `pages/auth/` | 認証フロー（ログイン・登録等） |

---

## レイアウト

| レイアウト | 適用場面 |
|---|---|
| `default.vue` | 認証済みユーザーの通常画面 |
| `auth.vue` | ログイン・登録画面 |
| `landing.vue` | 未ログイントップ |
| `error.vue` | エラー画面 |

---

## 状態管理（Pinia ストア）

| ストア | 責務 |
|---|---|
| `useUserStore` | 認証・ユーザー情報 |
| `useAppStore` | ガチャタイトル（アプリ）情報 |
| `useLogStore` | ガチャ履歴の取得・キャッシュ |
| `useStatsStore` | 統計データ管理 |
| `useStatsLayoutStore` | 統計タイル レイアウト管理 |
| `useOptionStore` | ユーザー設定・選択肢 |
| `useCsrfStore` | CSRF トークン管理 |
| `useLoaderStore` | グローバルローディング状態 |
| `useCurrencyStore` | 通貨データ管理 |
| `useFeatureFlagStore` | フィーチャーフラグ管理 |
| `globalStore` | 一時的なグローバル値 |

**方針**: キャッシュは必要最小限。空配列やエラー時データのキャッシュは行わない。

---

## API 通信

### エンドポイント定義

全 REST エンドポイント URL は `api/endpoints.ts` に一元化する。  
コンポーネント・コンポーザブルからは必ずここを経由して URL を取得する。

### リクエストフロー

1. ブラウザ → `fetch(endpoints.xxx())` → Nitro プロキシ (`server/api/`)
2. Nitro プロキシ → `SECRET_API_KEY` + `x-csrf-token` 付与 → Laravel API
3. Laravel API → JSON レスポンス → Nitro プロキシ → ブラウザ

### 認証方式

- **API キー**: `SECRET_API_KEY` を Nitro サーバサイドで付与（クライアント非公開）
- **CSRF トークン**: `/auth/login` レスポンスで取得し `useCsrfStore` で保持。失効時は `/auth/csrf/refresh` → リトライ

### composable

| composable | 役割 |
|---|---|
| `useAPI` | fetch ラッパー（エラーハンドリング・CSRF リトライ含む） |
| `useAuth` | ログイン・ログアウト・セッション管理 |
| `useGoogleAuth` | Google OAuth (PKCE) フロー |
| `usePkce` | PKCE コード生成・検証 |

---

## ミドルウェア

| ファイル | 種別 | 役割 |
|---|---|---|
| `middleware/auth.global.ts` | グローバル | 未認証ユーザーのアクセス制御 |
| `middleware/currency.global.ts` | グローバル | 通貨データの初期ロード |

---

## 国際化（i18n）

- `@nuxtjs/i18n` 使用
- ロケール: `ja`（日本語）/ `en`（英語）/ `zh`（中国語）
- 翻訳ファイル: `i18n/locales/*.ts`
- デフォルトロケールは `runtimeConfig.public.defaultLocale` で設定

---

## スタイリング原則

1. ユーティリティは **TailwindCSS v4** を優先
2. 詳細スタイルは `assets/styles/*.scss`
3. PrimeVue 固有スタイルは **PassThrough API**（`theme/ptPreset.ts`）で管理
4. コンポーネント内の `scoped` スタイルは原則書かない

---

## ビルド・バンドル

- Vite によるバンドル
- `manualChunks` で PrimeVue / Chart.js / Luxon を個別チャンクに分割し初期ロードを最適化
- Nuxt Sourcemap は `.env` の `NUXT_SOURCEMAP=true` で切り替え
- Cloudflare Workers にデプロイするため `nitro.preset = "cloudflare_module"` を設定

---

## 環境変数（主要）

| 変数名 | 用途 | サイド |
|---|---|---|
| `API_BASE_URL` | バックエンド API ベース URL | Server |
| `SECRET_API_KEY` | バックエンド認証キー（非公開） | Server |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID | Public |
| `APP_VERSION` | アプリバージョン | Public |
| `DEFAULT_LOCALE` | デフォルト言語 | Public |
| `MOCK_MODE` | モックモード切り替え | Public |
| `USE_FEATURE_FLAG` | フィーチャーフラグ有効化 | Public |

設定ファイル: 開発用 `.env.local` / 本番ビルド用 `.env.production`

---

## 関連ドキュメント

- `docs/operations/deploy-and-build.md`: ビルド・デプロイ・開発環境構築手順
- `docs/features/gallery/implementation-plan.md`: ギャラリー機能実装計画
- `contract/api-schema.yaml`: API 契約（正本）
