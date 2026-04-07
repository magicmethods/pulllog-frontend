# ビルド・デプロイ・開発環境構築

## 1. 目的

この文書は、PullLog フロントエンドの**日常開発・E2E・ビルド・Cloudflare Workers 配備**の基本手順をまとめた運用ガイドです。  
Windows 環境を前提に、**`pnpm` 固定**で作業することを想定しています。

---

## 2. 前提ツール

最低限、以下を事前に用意してください。

- Node.js 20 系以上
- `pnpm`
- Git
- ローカル HTTPS 証明書を扱える環境
- 必要に応じて Cloudflare Wrangler 認証

### ローカル開発時のホスト名

PullLog の既定ローカル URL は次の通りです。

- `https://pull.log:4649`（Nuxt 開発サーバ）

必要に応じて `hosts` ファイルへ以下を追加します。

```text
127.0.0.1 pull.log
```

> HTTPS 証明書は `public/localhost.pem` / `public/localhost-key.pem` を利用します。初回は OS 側で信頼設定が必要になる場合があります。

---

## 3. 環境ファイル

| ファイル | 用途 |
|---|---|
| `.env.local` | ローカル開発用（`pnpm dev`） |
| `.env.production` | 本番ビルド / プレビュー用 |
| `.env.e2e` | Playwright E2E 実行用 |
| `.env.example` | テンプレート / 共有用 |

### 基本ルール

- 秘密情報は**絶対にコミットしない**
- `.env*` は `.gitignore` 管理（`.env.example` を除く）
- API 接続先、OAuth、feature flag、E2E アカウント設定は各環境ファイルで切り替える

---

## 4. 初回セットアップ

```powershell
pnpm install
```

必要に応じて `.env.local` を作成し、以下のような値を設定します。

- `API_BASE_URL`
- `API_PROXY`
- `SECRET_API_KEY`
- `GOOGLE_CLIENT_ID`
- `DEFAULT_LOCALE`

---

## 5. ローカル開発

### 開発サーバ起動

```powershell
pnpm dev
```

- 既定 URL: `https://pull.log:4649`
- `nuxt.config.ts` の `devServer.host` / `devServer.port` / `https` 設定が使用されます
- API リクエストは Nitro プロキシ経由でバックエンドへ転送されます

### 補足

- フロントエンドだけでなく、必要なバックエンド API も到達可能であることを確認してください
- Google OAuth の確認を行う場合は、ホスト名のずれに注意してください

---

## 6. ビルド / プレビュー

### 本番ビルド

ビルド前は `.output` の残骸を掃除してから実行します。

```powershell
if (Test-Path .output) { Remove-Item -Recurse -Force .output }
pnpm build
```

- `package.json` の `build` は `nuxt build --dotenv .env.production` を実行します
- `nitro.preset = "cloudflare_module"` で Workers 向け成果物を生成します

> `pnpm build` または `pnpm preview` がタイムアウトした場合は、そのまま放置せず処理を中断して状況を確認してください。

### ローカル本番確認

```powershell
pnpm preview
```

### 静的エクスポート

```powershell
pnpm generate
```

### キャッシュクリア

```powershell
pnpm clean
```

---

## 7. E2E 実行フロー

PullLog の E2E は **manifest-driven Playwright** です。  
標準マトリクスは以下の 3 プロジェクトです。

- `chromium`
- `ipad-pro-11`
- `iphone-14`

### 初回ブラウザ導入

```powershell
pnpm run test:e2e:install
```

### バックエンド E2E 準備

```powershell
pnpm run test:e2e:prepare
```

### 標準マトリクスを実行

```powershell
pnpm run test:e2e
```

### 特定ケースだけ実行

```powershell
pnpm run test:e2e:case -- auth-apps-smoke
```

### 特定タグだけ実行

```powershell
pnpm run test:e2e:tag -- smoke
```

### 追加プロジェクト込みで広めに確認

```powershell
pnpm run test:e2e:all
```

### Markdown レポートを PDF 化

```powershell
pnpm run test:e2e:pdf -- e2e/reports/2026-04-07/auth-apps-smoke/report.md
```

### 主な出力先

| パス | 内容 |
|---|---|
| `e2e/reports/YYYY-MM-DD/index.md` | 日次サマリー |
| `e2e/reports/YYYY-MM-DD/<case-id>/report.md` | ケース別 Markdown レポート |
| `e2e/reports/YYYY-MM-DD/<case-id>/report.pdf` | 成功時の PDF evidence |
| `tests/test-results/html-report/` | Playwright HTML レポート |
| `tests/test-results/artifacts/` | 失敗時アーティファクト |

詳細方針は `docs/architecture/e2e-test.md` を参照してください。

---

## 8. Cloudflare Workers への配備

配備関連コマンドは `package.json` に定義されています。

```powershell
pnpm wrangler_login
pnpm wrangler_preview
pnpm wrangler_deploy
```

### 補足

- `wrangler_preview` は Workers ローカル確認用です
- `wrangler_deploy` は `.output/` を前提に実行します
- ルートや `account_id` などは `nuxt.config.ts` の `nitro.cloudflare.wrangler` 設定を参照してください

---

## 9. フォーマット / 品質確認

```powershell
pnpm format
```

または必要に応じて:

```powershell
npx @biomejs/biome check --write .
```

- pre-commit では `husky` + `lint-staged` が動作します
- 大きな変更前後で不要な整形差分を出しすぎないよう注意してください

---

## 10. トラブルシューティング

### `.output` が削除できない（Windows でロックされる）

```powershell
taskkill /IM node.exe /F
Remove-Item -Recurse -Force .output
```

### `pull.log:4649` が競合している

- 既存 Node プロセスの残骸を確認する
- 必要に応じて `NUXT_PORT` / `PORT` を切り替える
- `nuxt.config.ts` の `devServer` 設定も参照する

### E2E が起動しない / API に繋がらない

- バックエンド E2E サーバが起動しているか確認する
- `.env.e2e` の API / 認証情報を確認する
- `tests/playwright/playwright.config.ts` と `e2e/cases/*.json` の想定環境が一致しているか確認する

### ビルドが重い / 失敗する

- `.output` を削除して再ビルドする
- キャッシュを `pnpm clean` で掃除する
- 必要なら Node プロセスのロックを解除してから再試行する

---

## 11. 関連ドキュメント

- `docs/README.md`
- `docs/architecture/overview.md`
- `docs/architecture/e2e-test.md`
- `../README.md`
- `../contract/api-schema.yaml`（API 契約の正本）
