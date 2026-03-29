# Frontend Docs Index

このディレクトリは、フロントエンドの開発・運用で継続参照するドキュメントを置く場所です。

## ディレクトリ構成

```
docs/
├── README.md                        # このファイル
├── architecture/
│   └── overview.md                  # システム構成・ルーティング・状態管理・API通信方針
├── features/
│   └── gallery/
│       ├── implementation-plan.md   # ギャラリー機能 全体実装計画・優先順位
│       ├── api-foundation-plan.md   # FE-G1: API基盤整備
│       ├── list-ui-plan.md          # FE-G2: 一覧・フィルタUI
│       ├── usage-meter-plan.md      # FE-G3: 使用量メーター
│       ├── upload-flow-plan.md      # FE-G4: アップロードフロー
│       └── asset-detail-and-private-access-plan.md  # FE-G5: 詳細・配信強化
├── integrations/
│   └── backend/
│       └── gallery-upload-ticket-api-spec.md  # バックエンド連携仕様（uploadTicket API）
└── operations/
    └── deploy-and-build.md          # ビルド・デプロイ・開発環境構築手順
```

## 役割

| ディレクトリ | 置くもの |
|---|---|
| `architecture/` | 画面構成・状態管理・API通信・設計原則 |
| `features/` | 機能ごとの実装計画・仕様メモ・設計判断 |
| `integrations/` | 他システム・バックエンドとの連携仕様 |
| `operations/` | ビルド・デプロイ・運用・障害対応 |

## 運用ルール

- GitHub Issue の正本は GitHub 側に置く
- Issue 起票は `.github/ISSUE_TEMPLATE/` のテンプレートから行う
- `docs/` には、Issue から参照される長期保存向けドキュメントを置く
- 一時メモ、壁打ち、未整理の調査ログは `.codex/` に置く
- `docs/` 配下のファイル名は `*-plan.md`、`*-spec.md`、`*-notes.md` のように用途が分かる名前を使う

## GitHub Issue テンプレート

| テンプレート | 用途 |
|---|---|
| `frontend-task.yml` | 実装タスクの起票 |
| `frontend-bug.yml` | 不具合の起票 |
| `frontend-investigation.yml` | 調査・設計検討 |
| `backend-integration-request.yml` | バックエンドAPIや契約変更の依頼 |
