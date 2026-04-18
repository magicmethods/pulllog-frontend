# リポジトリ ガイドライン

## 用語方針
- PullLog 全体は `workspace`、`frontend/` など各トップレベルディレクトリは `subproject` と呼ぶ。
- 正式な定義は `../pulllog-docs/docs/workspace-terminology.md` を参照する。
- VS Code 機能の説明では `workspace` / `workspace folder`、pnpm の説明では `pnpm workspace` など公式用語を優先する。

## プロジェクト構成とモジュールの整理
- `pages/`: ルート駆動のビュー。`layouts/` は画面枠、`middleware/` はガード処理、`app.vue` はルートコンポーネント。
- `components/`: 再利用可能な Vue コンポーネント（PrimeVue リゾルバ経由で自動インポート）。
- `stores/`: Pinia ストア（例: `useUserStore`）。
- `composables/`: 再利用可能なロジック（例: `useFetchSomething.ts`）。
- `server/`: Nitro API ルートとサーバーミドルウェア。
- `i18n/locales/`: 翻訳ファイル（`en.ts`, `ja.ts`, `zh.ts`）。設定は `i18n/i18n.config.ts`。
- `assets/`, `public/`: スタイル、画像、ローカル開発用証明書（`public/localhost*.pem`）。
- ルート設定: `nuxt.config.ts`, `app.config.ts`, `tailwind.config.ts`。
- API ルート/REST エンドポイントの定義は `api/endpoints.ts` に一元化する。
- コンポーネント/コンポーザブルの単体ファイルで閉じる型定義以外は `types/` 下にグローバル型として定義する。

## ビルド・テスト・開発コマンド
- インストール: `pnpm i`
- 開発: `pnpm dev` → https://pull.log:4649 （必要なら hosts に `127.0.0.1 pull.log` を追加）。
- ビルド: `pnpm build` （`.env.production` を使用）。
- プレビュー: `pnpm preview`
- 静的エクスポート: `pnpm generate`
- キャッシュ削除: `pnpm clean`
- Cloudflare Workers: `pnpm wrangler_login`, `pnpm wrangler_preview`, `pnpm wrangler_deploy` （ビルド後）。

## コーディング規約と命名規則
- TypeScript + `<script setup lang="ts">` を使用。インデントは 4スペース。
- セミコロンは基本的に省略。構文上必要な場合のみ付与。
- コンポーネント: `PascalCase.vue`。ルート: `pages/` 内は kebab-case。composables: `useXxx.ts`。ストア: `useXxxStore`。
- スタイルは TailwindCSS ユーティリティを優先。独自 CSS は極力避ける。
- バイナリ以外のリソースファイルは原則文字コード `UTF-8` で `BOM` 無し、改行コードは `LF` とする。原則から外れる場合は通知すること。
- 整形・Lint: Biome を使用。例: `npx @biomejs/biome check --write .`

## 禁止事項
- `any` 型の使用は原則禁止。どうしても必要な場合は `unknown` + 型ガードで扱う。  
- `console.log` を残さない。デバッグは Logger または開発専用ユーティリティを使用する。  
- 非null アサーション（`!`）は禁止。代わりに型ガードやオプショナルチェーンを利用する。  
- メソッドには原則 TypeDoc 準拠の JSDoc コメントを付与すること。  
- API 通信は必ず `fetch` を利用し、`useFetch` は使用しない。  
- `forEach` 構文で第二引数（インデックス）を使わない場合は `for` 構文を使う。  

## テスト指針
- 現在、正式なテストスイートは未導入。PR は小さくまとめ、手動確認手順を含めること。
- テストを追加する場合は Vitest を推奨。`tests/` 配下に `*.spec.ts` を配置し、`vitest` で実行。

## コミット & Pull Request ガイドライン
- コミットメッセージ: 命令形で簡潔に。推奨プレフィックス: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`。
- 内容: 何を・なぜやったかを記載。スコープ例: `fix(auth): handle expired token`。
- PR: 明確な説明、関連 Issue のリンク、UI 変更はスクショ、ユーザー文言変更時は i18n 更新も含める。
- ローカル確認: `pnpm build` および `pnpm preview` が通ることを確認してからレビュー依頼。

## セキュリティ & 設定の注意点
- 環境ファイル: `.env.local`（開発用）、`.env.production`（ビルド用）。秘密情報はコミット禁止。
- `pnpm build` を行う場合、直前に `.output` ディレクトリを削除すること。もし他のプロセスが掴んでロックされている場合は `taskkill /IM node.exe /F` 後に `Remove-Item -Force .output` で削除する。
- `pnpm build` もしくは `pnpm preview` を実行しCLIがタイムアウトした場合は処理を中断して状況を報告すること。
- `runtimeConfig` のキー（例: `API_BASE_URL`, `GOOGLE_CLIENT_ID`）は正しく設定すること。
- ローカル HTTPS は `public/` 内の証明書を使用。警告が出たら信頼設定を行うこと。

## API Contract
- API スキーマの正本は `contract/api-schema.yaml`（contract ワークスペース管理）。`frontend/api-schema.yaml` は参照用ローカルコピーであり、正本ではない。
- エンドポイントを追加・変更する際は必ず `contract/api-schema.yaml` を参照すること。
- マルチルートワークスペース（`frontend.code-workspace` または `pulllog.code-workspace`）では `${workspaceFolder:contract}/api-schema.yaml` としてアクセス可能。

## Docs / Issue 運用
- `docs/` は長期参照する開発・運用ドキュメントを置く。機能計画は `docs/features/`、連携仕様は `docs/integrations/` を使う。
- GitHub Issue の正本は GitHub 側に置き、起票時は `.github/ISSUE_TEMPLATE/` のテンプレートを利用する。
- 一時的な作業メモ、壁打ち、未整理の調査ログは `.codex/` に置く。
- `docs/` 配下のファイル名は `*-plan.md`、`*-spec.md`、`*-notes.md` のように用途が分かる名前を使う。

## その他
- `.codex/` を codex CLI で作業する際のテンポラリディレクトリとして利用する。作業用の一時ファイルやバグレポート、Issueのひな形、補足ドキュメント等を自由に出力して構いません。

## Workspace Root Policy Summary
- 上位階層（`pulllog/AGENTS.md`）の共通方針に合わせ、Windows では PowerShell を優先する。
- Python は存在を前提にしない。未確認状態で Python スクリプトを生成・実行しない。
- 実行コマンドは以下を優先する: `package.json` の既存スクリプト → リポジトリ内既存スクリプト → PowerShell → Node.js。
- frontend ではパッケージマネージャーを `pnpm` に固定し、`npm` へ切り替えない。
- 検証は最小単位から行い、不要なフルビルドや無関係な変更を避ける。
