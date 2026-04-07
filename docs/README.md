# Frontend Docs Index

この `docs/` は、PullLog フロントエンドで**継続参照する設計・運用ドキュメントの索引**です。  
日々の実装メモではなく、Issue / PR / 運用手順から参照される**長期保存向け情報**を置きます。

---

## 主要ドキュメント

| ファイル | 概要 |
|---|---|
| `architecture/overview.md` | フロントエンド全体構成、Nuxt / Nitro / Pinia / API プロキシ方針の整理 |
| `architecture/e2e-test.md` | Playwright の **manifest-driven E2E** アーキテクチャ、標準マトリクス、レポート / PDF evidence 方針 |
| `operations/deploy-and-build.md` | 開発環境構築、`pnpm dev` / `pnpm build` / `pnpm preview` / Workers デプロイ手順 |
| `integrations/backend/gallery-upload-ticket-api-spec.md` | ギャラリー upload ticket API のバックエンド連携仕様 |
| `features/gallery/*.md` | ギャラリー機能の実装計画・段階別メモ |

---

## ディレクトリ構成

```text
docs/
├── README.md                                     # このファイル
├── architecture/
│   ├── overview.md                               # システム構成・ルーティング・状態管理・API通信方針
│   └── e2e-test.md                               # Playwright E2E アーキテクチャ / manifest / report policy
├── features/
│   └── gallery/
│       ├── implementation-plan.md                # ギャラリー機能 全体実装計画・優先順位
│       ├── api-foundation-plan.md                # FE-G1: API基盤整備
│       ├── list-ui-plan.md                       # FE-G2: 一覧・フィルタUI
│       ├── usage-meter-plan.md                   # FE-G3: 使用量メーター
│       ├── upload-flow-plan.md                   # FE-G4: アップロードフロー
│       └── asset-detail-and-private-access-plan.md # FE-G5: 詳細・配信強化
├── integrations/
│   └── backend/
│       └── gallery-upload-ticket-api-spec.md     # バックエンド連携仕様（uploadTicket API）
└── operations/
    └── deploy-and-build.md                       # ビルド・デプロイ・開発環境構築手順
```

---

## 役割

| ディレクトリ | 置くもの |
|---|---|
| `architecture/` | 画面構成、状態管理、API 通信、E2E アーキテクチャなどの設計原則 |
| `features/` | 機能単位の実装計画、仕様メモ、設計判断 |
| `integrations/` | バックエンドや外部システムとの連携仕様 |
| `operations/` | ビルド、デプロイ、運用、開発環境構築手順 |

---

## 最近の更新ポイント

- Playwright E2E は **manifest-driven** 運用に統一
- 標準実行マトリクスは **`chromium` / `ipad-pro-11` / `iphone-14`**
- 実行レポートは `e2e/reports/YYYY-MM-DD/<case-id>/report.md` に集約
- 成功ケースは `pnpm run test:e2e:pdf -- <report.md>` で PDF evidence を生成可能
- レポート / evidence テンプレートは `e2e/templates/` および `e2e/templates/pulllog/` を利用

詳細は `architecture/e2e-test.md` を参照してください。

---

## 運用ルール

- GitHub Issue の正本は GitHub 側に置く
- Issue 起票は `.github/ISSUE_TEMPLATE/` のテンプレートから行う
- `docs/` には、Issue や PR から参照される**長期保存向けドキュメント**のみを置く
- 一時メモ、壁打ち、未整理の調査ログは `.codex/` に置く
- ファイル名は `*-plan.md`、`*-spec.md`、`*-notes.md` のように用途が分かる名前を使う
- API 仕様の正本は `../contract/api-schema.yaml` であり、フロント側 docs では契約の要約・補足のみを扱う

---

## GitHub Issue テンプレート

| テンプレート | 用途 |
|---|---|
| `frontend-task.yml` | 実装タスクの起票 |
| `frontend-bug.yml` | 不具合の起票 |
| `frontend-investigation.yml` | 調査・設計検討 |
| `backend-integration-request.yml` | バックエンド API / 契約変更の依頼 |

---

## 関連リンク

- ルート README: `../README.md`
- E2E アーキテクチャ: `./architecture/e2e-test.md`
- システム概要: `./architecture/overview.md`
- デプロイ / ビルド: `./operations/deploy-and-build.md`
- API 契約正本: `../contract/api-schema.yaml`（multi-root workspace で参照）
