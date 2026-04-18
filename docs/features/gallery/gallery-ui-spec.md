# Gallery UI Spec

## Overview

- feature 名: Gallery current UI snapshot with blocked FE-G5 detail modal
- 対象画面: `pages/gallery.vue`
- 参照設計: `_list-ui-plan.md`, `_usage-meter-plan.md`, `_upload-flow-plan.md`, `_asset-detail-and-private-access-plan.md`

## UI Objective

- FE-G2: 期間フィルタ付きの gallery 一覧と empty / loading / error state を提供する。
- FE-G3: usage meter を一覧画面上で可視化し、関連操作後に更新する。
- FE-G4: 同画面から画像アップロードを完結させる。
- FE-G5: asset detail / edit / delete をモーダルで扱う実装が worktree に存在するが、現在は blocked / unverified である。

## Affected Screens and Components

- `pages/gallery.vue`: page header、period filters、upload CTA、usage meter、asset grid、detail modal 起動
- `components/gallery/GalleryUsageMeter.vue`: 使用量表示
- `components/gallery/GalleryAssetCard.vue`: asset card 表示と詳細オープン導線
- `components/gallery/GalleryUploadDialog.vue`: upload dialog
- `components/gallery/GalleryAssetDetailModal.vue`: detail / edit / delete 用モーダル。存在するが現時点では blocked / unverified

## Information Hierarchy

- 1段目: page title と説明文
- 2段目: period filter と upload CTA
- 3段目: usage meter
- 4段目: global error / loading / empty / asset grid
- overlay: upload dialog、detail modal

## Interaction and State Design

- 初期表示: page mount 時に一覧と usage を並列取得する。
- loading: 初回一覧取得中は page 内 loading panel、upload 中は upload dialog の submit を loading、detail 側は asset fetch / save / delete 時に store 状態を利用する設計になっている。
- empty: asset が 0 件なら empty panel を表示する。
- success: upload 成功時は toast を表示し、store が一覧 page 1 と usage を refresh する。
- error: page fetch error は inline panel、upload error は dialog 内 Message と toast で表示する。
- card click: `GalleryAssetCard.vue` から `open` event を発火し、`pages/gallery.vue` が `GalleryAssetDetailModal.vue` を開く。placeholder toast 挙動ではない。
- detail modal behavior: asset detail の読み込み、title / description / visibility 編集、delete confirmation を意図した UI があるが、blocking errors により現状は完了扱いにできない。
- validation: upload 初期スコープでは file 必須、画像以外 reject、title / description は任意、visibility は必須初期値 `private`。

## Implemented vs Blocked Behaviors

- 実装済み: 一覧表示、period preset 切替、load more、empty / error / loading states、usage meter、upload CTA、upload dialog、upload 後 refresh、i18n 文言追加。
- 部分実装かつ blocked: detail modal の load / save / delete 導線。
- 未検証: detail modal 全体、non-mock backend 接続時の detail / update / delete、追加済み unit tests の実行結果。

## Responsive Notes

- desktop: upload dialog と detail modal は広めのモーダル幅を前提にしている。upload dialog は preview と form の 2 カラム構成。
- mobile: dialog は単一カラム、幅は画面いっぱいに近いサイズ。
- breakpoint 上の注意: asset grid は `sm` / `xl` を維持し、filter row は `lg` で CTA を横並びにする。

## Accessibility Notes

- keyboard: Button / RadioButton / FileUpload / Dialog の既存キーボード操作に従う。
- screen reader: 入力ラベル、dialog header、error message、外部リンク文言を明示する。
- focus management: Dialog に委譲し、close 時は起点コントロールへ戻る PrimeVue 挙動を利用する前提である。

## Copy and i18n Notes

- 追加済み文言: upload CTA、upload dialog 説明、field labels、validation / upload error、save / delete / upload toast、detail modal 文言。
- 現時点の注意: detail modal 文言は実装されているが、UI 挙動自体は blocked のため未検証である。

## Component Reuse and New UI Needs

- 再利用する component: `GalleryUsageMeter`, `GalleryAssetCard`, PrimeVue `Dialog`, `FileUpload`, `InputText`, `Textarea`, `RadioButton`, `Message`, `Button`, `Toast`
- 現在の worktree で追加済み component: `GalleryUploadDialog.vue`, `GalleryAssetDetailModal.vue`
- 追加 UI が残る可能性: タグ入力、ログ再紐付け、private access 補強、署名付き URL TTL 対応

## Implementation Notes for Restart

- mockMode では既存 fixture を通るため、upload までは frontend 単独で確認しやすい。
- detail modal は存在するが、まず `components/gallery/GalleryAssetDetailModal.vue` の editor problems を解消しないと UI 確認に進めない。
- 実 backend の upload 制限、detail API 応答、タグ / log 再関連付け UI は今後の確認事項である。