# ビルド・デプロイ・開発環境構築

## 開発環境セットアップ

```bash
# 依存関係インストール
pnpm i

# 環境変数設定（初回のみ）
cp .env.example .env.local  # 開発用
# .env.local を編集して API_BASE_URL, SECRET_API_KEY 等を設定

# 開発サーバ起動
pnpm dev
# → https://pull.log:4649
```

> ローカルで HTTPS アクセスするために `hosts` ファイルへ `127.0.0.1 pull.log` を追加すること。  
> 証明書は `public/localhost*.pem` を使用。初回は OS の信頼設定が必要な場合がある。

---

## 環境定義ファイル

| ファイル | 用途 |
|---|---|
| `.env.local` | 開発時（`pnpm dev`） |
| `.env.production` | 本番ビルド時（`pnpm build`） |
| `.env.example` | テンプレート（コミット対象） |

**秘密情報は絶対にコミットしない。** `.env*` は `.gitignore` に含まれる（`.env.example` を除く）。

---

## ビルド

```bash
# ビルド前に .output を削除する（ロックされている場合は Node プロセスを終了してから）
rm -rf .output

# 本番ビルド
pnpm build
# → .output/ に成果物を生成（nitro.preset = cloudflare_module）
```

> `pnpm build` / `pnpm preview` を実行して CLI がタイムアウトした場合は処理を中断し、状況を報告すること。

---

## プレビュー（ローカル本番確認）

```bash
pnpm preview
# → .output/ を使ってローカルでサーバを起動
```

---

## 静的エクスポート

```bash
pnpm generate
# → .output/public/ に静的ファイルを生成
```

---

## キャッシュクリア

```bash
pnpm clean
# → .nuxt と node_modules/.vite を削除
```

---

## デプロイ先

- **Cloudflare Workers** (`cloudflare_module` プリセット)
- `pnpm build` 後に以下で行う:

```bash
pnpm wrangler_login      # Cloudflare 認証
pnpm wrangler_preview    # Workers ローカルプレビュー
pnpm wrangler_deploy     # 本番デプロイ（.output/ から）
```

デプロイ設定は `nuxt.config.ts` の `nitro.cloudflare.wrangler` セクション参照。  
`account_id` や `routes` はそこで管理される。

---

## Lint / フォーマット

```bash
# Biome で一括チェック＆修正
npx @biomejs/biome check --write .

# husky + lint-staged（コミット前自動実行）
# 設定: package.json > lint-staged
```

---

## CI/CD

- ブランチ戦略: `main`（本番）/ `staging`（ステージング）
- CI: `.github/workflows/ci.yml`
- CI が通過するまでマージ不可

---

## ヘルスチェック

本番確認用のエンドポイント:

```
GET https://api.pulllog.net/api/v1/dummy
```

---

## トラブルシューティング

### `.output` が削除できない（Windowsでロックされる）

```powershell
taskkill /IM node.exe /F
Remove-Item -Force -Recurse .output
```

### 型エラーでビルドを通したい（緊急時のみ）

```bash
NUXT_TYPESCRIPT_CHECK=false pnpm build
```

### ポートが使用中

```bash
# pull.log:4649 が競合している場合は nuxt.config.ts の devServer.port を変更
```

---

## 関連ドキュメント

- `docs/architecture/overview.md`: システム全体構成
- `contract/api-schema.yaml`: API 契約（正本）
- `pulllog-docs/docs/ops.md`: 運用全体（インフラ・バックアップ・インシデント対応）
