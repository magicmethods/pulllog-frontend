# Implementation Notes

## Overview

- feature 名: Gallery current worktree snapshot
- 実装担当: Copilot による文書整理
- 更新日: 2026-04-18

## Changed Files

- `api/endpoints.ts`
- `composables/useGalleryApi.ts`
- `components/gallery/GalleryAssetCard.vue`
- `components/gallery/GalleryUsageMeter.vue`
- `components/gallery/GalleryUploadDialog.vue`
- `components/gallery/GalleryAssetDetailModal.vue`
- `pages/gallery.vue`
- `server/api/gallery/assets/index.get.ts`
- `server/api/gallery/assets/upload-ticket.post.ts`
- `server/api/gallery/assets/[assetId].get.ts`
- `server/api/gallery/assets/[assetId].patch.ts`
- `server/api/gallery/assets/[assetId].delete.ts`
- `server/api/gallery/usage.get.ts`
- `stores/useGalleryStore.ts`
- `types/gallery.d.ts`
- `utils/gallery.ts`
- `i18n/locales/ja.ts`
- `i18n/locales/en.ts`
- `i18n/locales/zh.ts`
- `tests/unit/gallery.utils.spec.ts`
- `tests/unit/useGalleryStore.spec.ts`
- `docs/features/gallery/workflow-notes.md`
- `docs/features/gallery/gallery-plan.md`
- `docs/features/gallery/gallery-ui-spec.md`
- `docs/features/gallery/implementation-notes.md`
- `docs/features/gallery/review-notes.md`

## Current Implementation Notes

- FE-G1 相当の基盤として、gallery endpoints、`useGalleryApi.ts`、`useGalleryStore.ts`、`types/gallery.d.ts`、`utils/gallery.ts`、Nitro proxy handlers、csrf bootstrap support、mocks、basic unit tests が worktree に揃っている。
- FE-G2 相当として、`pages/gallery.vue` と `GalleryAssetCard.vue` による一覧 UI、period presets、load more、empty / error / loading state が入っている。
- FE-G3 相当として、`GalleryUsageMeter.vue` と usage refresh 挙動が入っている。
- FE-G4 相当として、`GalleryUploadDialog.vue`、upload CTA、`useGalleryStore.uploadAsset()` の upload 後 list / usage refresh、関連 i18n 文言が入っている。
- FE-G5 相当として、`GalleryAssetDetailModal.vue` が存在し、`pages/gallery.vue` からカード click で開く配線もある。placeholder toast のみの状態ではなく、少なくとも stale response / race-condition を避けるための最小修正が入っている。

## Current Blocker

- FE-G5 の runtime 検証の主ブロッカーは local backend の接続条件であり、frontend の `.env.local` 前提と backend の `.env.e2e` 前提が衝突すると `API_KEY` が不一致になって local login 401 を起こす。
- `backend/stable/composer.json` の `e2e:serve` は `--env=e2e` で起動するため、frontend の通常 local 前提とは合わない。再開時は backend を E2E 用ではなく通常 local 起動で使う前提に切り替える必要がある。
- upload の non-mock runtime 検証には別ブロッカーが残る。frontend の direct upload は `x-api-key` を送っておらず、backend の `POST /gallery/assets` は `auth.apikey` ミドルウェア配下なので、upload 本体は 401 になり得る。
- 上記のため、detail / save / delete の確認と upload の確認は同一ブロッカーとして扱わず切り分ける。

## Tests or Checks Added and Run

- `tests/unit/gallery.utils.spec.ts`: direct upload failure が `ApiError` と status を返すケースが追加済み。
- `tests/unit/useGalleryStore.spec.ts`: upload 成功後に一覧と usage を refresh するケースが追加済み。
- `vitest.config.ts` 追加と `package.json` への `test:unit` / `vitest` 追加により、unit verification の実行経路は回復済み。
- このメモでは test command の再実行結果を確定扱いしない。必要ならこの会話内の delegated verification の pass 報告を参照しつつ、再開時に再実行して記録する。
- backend 検証や non-mock 動作確認もこの会話では実施していない。

## Manual Verification Snapshot

- コード読解ベースで、`pages/gallery.vue` から upload dialog と detail modal の両方が配線されていることを確認した。
- コード読解ベースで、upload 成功後に store が一覧 page 1 と usage を refresh する実装を確認した。
- コード読解ベースで、asset card click が `open` event を発火し、ページ側で detail modal を開く構成を確認した。
- コード読解ベースで、detail modal 側に requestId ベースの stale response / race-condition 対策が入っていることを確認した。
- 実行ベースの手動確認は今回行っていない。

## Deviations from Earlier Docs

- 以前の文書にあった「asset card click は placeholder toast」の記述は current state と不一致だったため修正対象とした。
- 以前の文書にあった「FE-G5 未着手」の記述は current state と不一致だったため、「部分実装だが blocked」へ修正した。
- 以前の文書にあった「FE-G5 の主因は parse / type error」とする書き方は current state とずれるため、runtime 側の接続条件と upload 契約ズレを主ブロッカーとして反映した。

## Known Constraints and Residual Risks

- local backend を E2E 用に起動すると frontend の `.env.local` と `API_KEY` が噛み合わず、login 401 により FE-G5 の runtime 検証へ進めない。
- upload は direct upload 本体で `x-api-key` を送っていないため、backend の `auth.apikey` 条件と契約ズレが残っている。
- detail / save / delete は upload と別ブロッカーとして扱う必要がある。
- upload 成功後に一覧を page 1 へ戻すため、無限スクロール途中位置は維持しない。
- 実 backend の 409 / 403 / 422 payload が想定と違う場合、error 文言や分岐の調整が必要になる可能性がある。
- non-mock 環境での upload / detail / update / delete / usage refresh は未確認である。

## Resume Steps

1. backend を E2E 用ではなく通常 local 起動で整え、frontend の `.env.local` と `API_KEY` / 接続条件を揃える。
2. seeders を参照して non-demo ユーザーで login を確認し、local 401 を先に潰す。
3. `pages/gallery.vue` から詳細モーダルを開き、detail fetch、save、delete の導線を確認する。
4. `vitest.config.ts` と `package.json` の unit 経路回復を前提に、`tests/unit/gallery.utils.spec.ts` と `tests/unit/useGalleryStore.spec.ts` を必要に応じて再実行し、結果を記録する。
5. upload は別ブロッカーとして最後に扱い、non-mock 環境で upload-ticket と direct upload 本体の契約差分を確認する。
6. 検証後に `review-notes.md` を正式レビュー結果へ更新する。