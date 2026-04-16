# Feature Docs Templates

このディレクトリは、5役ワークフローで利用する feature ドキュメントの共通ひな形です。

## 使い方

- feature ごとに `docs/features/<feature-slug>/` を作成する
- このディレクトリのファイルを複製し、feature 用の名前へ変更して使う
- 長期参照する成果物のみ `docs/features/` に保存し、一時メモは `.codex/` に置く

## 推奨ファイル対応

| 用途 | テンプレート | 保存例 |
|---|---|---|
| Orchestrator の進行メモ | `workflow-notes.md` | `docs/features/<feature-slug>/workflow-notes.md` |
| Architect の設計 | `feature-plan.md` | `docs/features/<feature-slug>/<feature-slug>-plan.md` |
| UI/UX の仕様 | `ui-spec.md` | `docs/features/<feature-slug>/<feature-slug>-ui-spec.md` |
| Implementer の検証メモ | `implementation-notes.md` | `docs/features/<feature-slug>/implementation-notes.md` |
| Reviewer のレビュー結果 | `review-notes.md` | `docs/features/<feature-slug>/review-notes.md` |

## 関連

- `../../architecture/feature-development-workflow.md`
- `../../architecture/overview.md`
- `../../../AGENTS.md`