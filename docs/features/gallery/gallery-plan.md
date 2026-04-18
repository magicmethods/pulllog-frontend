# Gallery Feature Plan

## Overview

- feature 名: Gallery current-state tracking and pause snapshot
- 対象 Issue / 要件: FE-G1 から FE-G5 までの frontend 実装状況整理、paused state 保存、gallery 文書の current state 化
- 更新日: 2026-04-17

## Requirement Summary

- FE-G1 は実装済み。gallery API endpoints、`useGalleryApi.ts`、`useGalleryStore.ts`、`types/gallery.d.ts`、`utils/gallery.ts`、Nitro proxy handlers、csrf bootstrap support、mocks、basic unit tests が worktree に存在する。
- FE-G2 は実装済み。`pages/gallery.vue` と `components/gallery/GalleryAssetCard.vue` により一覧画面、period presets、load more、empty / error / loading states が入っている。
- FE-G3 は実装済み。`components/gallery/GalleryUsageMeter.vue` と usage refresh が入っている。
- FE-G4 は実装済み。`components/gallery/GalleryUploadDialog.vue`、upload CTA、`useGalleryStore.uploadAsset()` 後の list / usage refresh、i18n 追加が入っている。
- FE-G5 は未消滅ではなく部分実装。`components/gallery/GalleryAssetDetailModal.vue` が存在し `pages/gallery.vue` から開く配線もあるが、VS Code problem output 上の blocking parse / type errors により完了・検証済みとは扱えない。
- このファイルは新規実装計画書というより、再開用の current-state 記録を兼ねる。

## Current Implementation Snapshot

- 画面入口: `pages/gallery.vue`
- 一覧表示: `components/gallery/GalleryAssetCard.vue`
- 使用量表示: `components/gallery/GalleryUsageMeter.vue`
- アップロード UI: `components/gallery/GalleryUploadDialog.vue`
- 詳細モーダル: `components/gallery/GalleryAssetDetailModal.vue` が存在するが blocked / unverified
- 状態管理: `stores/useGalleryStore.ts`
- API / 正規化: `composables/useGalleryApi.ts`, `utils/gallery.ts`, `api/endpoints.ts`
- 型: `types/gallery.d.ts`
- プロキシ: `server/api/gallery/**`
- テスト: `tests/unit/gallery.utils.spec.ts`, `tests/unit/useGalleryStore.spec.ts`

## Non-goals

- 今回の文書更新でアプリコードや blocking errors を直すこと
- backend / contract の修正
- FE-G5 完了後に扱う可能性が高い追加スコープ全般
- 複数ファイルアップロード、タグ補完、ログ再紐付け、private access 強化、署名付き URL TTL 対応の確定レビュー

## Architecture Snapshot

- 入口となる page / component は `pages/gallery.vue` で、period filter、upload CTA、usage meter、asset grid、detail modal 起動を持つ。
- state ownership は一覧・usage・selection・upload・save 状態を `stores/useGalleryStore.ts` に集約する。
- data flow は `useGalleryApi.ts` と `utils/gallery.ts` を介し、upload-ticket 取得、direct upload、list / usage refresh、detail fetch、update、delete を担当する。
- Nitro 側は `server/api/gallery/**` に proxy handlers があり、gallery assets / usage / upload-ticket / detail 系を中継する。

## Impacted Files

- `api/endpoints.ts`
- `composables/useGalleryApi.ts`
- `components/gallery/GalleryAssetCard.vue`
- `components/gallery/GalleryUsageMeter.vue`
- `components/gallery/GalleryUploadDialog.vue`
- `components/gallery/GalleryAssetDetailModal.vue`
- `pages/gallery.vue`
- `stores/useGalleryStore.ts`
- `types/gallery.d.ts`
- `utils/gallery.ts`
- `server/api/gallery/**`
- `i18n/locales/ja.ts`
- `i18n/locales/en.ts`
- `i18n/locales/zh.ts`
- `tests/unit/gallery.utils.spec.ts`
- `tests/unit/useGalleryStore.spec.ts`
- `docs/features/gallery/*.md`

## API and Backend Alignment

- 使用 API: `POST /gallery/assets/upload-ticket`, `GET /gallery/assets`, `GET /gallery/assets/{id}`, `PATCH /gallery/assets/{id}`, `DELETE /gallery/assets/{id}`, `GET /gallery/usage`
- `api/endpoints.ts` では gallery endpoints が定義済みで、frontend 側はこれを使用している。
- non-mock 動作は backend の availability に依存するため、未配備環境では mockMode を継続利用する。
- drift リスクは detail modal 側の未検証状態と、実 backend の 409 / 403 / 422 payload 粒度差に残る。

## Validation and Error Handling Snapshot

- upload では file 必須、非画像 reject、inline error と toast、成功時の list / usage refresh が入っている。
- list page では global error、initial loading、empty、load more が入っている。
- detail modal では load / save / delete を意図した UI と toast 文言が存在するが、blocking errors のため挙動を信頼できる状態ではない。
- この会話では automated tests を実行しておらず、追加済み unit tests の実行結果は未取得である。

## Paused-state Risks

- `components/gallery/GalleryAssetDetailModal.vue` の parse / type errors が FE-G5 全体を止めている。
- 詳細モーダルが blocked のため、asset detail/update/delete の最終挙動は未検証である。
- upload 成功後に一覧を page 1 に戻すため、無限スクロール途中位置は維持されない。
- mockMode 中心の確認に寄ると、実 backend の validation / error payload 差異が後で顕在化する可能性がある。

## Resume Plan

1. `components/gallery/GalleryAssetDetailModal.vue` の editor problems を解消する。
2. `pages/gallery.vue` から detail modal を開く一連の導線を再確認する。
3. `tests/unit/gallery.utils.spec.ts` と `tests/unit/useGalleryStore.spec.ts` を実行し、結果を記録する。
4. 可能なら non-mock 環境で upload / detail / update / delete / usage refresh を確認する。
5. 検証結果に合わせて review-notes を正式レビューへ更新する。