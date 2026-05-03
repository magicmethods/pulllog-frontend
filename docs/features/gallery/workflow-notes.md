# Workflow Notes

## Feature

- 名前: Gallery
- feature-slug: gallery
- 参照 Issue / 要件: FE-G1 から FE-G5 までの gallery 実装状況整理、停止時点の状態保存、文書 drift 解消

## Request Summary

- 2026-04-18 時点の frontend 実装実態に合わせて、gallery 配下の長期参照ドキュメントを current state へ更新する。
- FE-G1 から FE-G4 までは worktree 実装済みとして扱い、FE-G5 は存在する実装を「進行中だがブロック中」として記録する。
- 開発を一旦停止する前提で、再開時に迷わない resume 情報を残す。
- 2026-04-19 の local-dev 実機確認結果を反映し、frontend 側の runtime lane 問題と backend 側の runtime blocker を切り分ける。

## Scope and Non-goals

- 対象: gallery 実装状態の棚卸し、停止時点のステータス更新、resume checklist 追加、古い placeholder 記述の是正
- 非対象: アプリケーションコード修正、`components/gallery/GalleryAssetDetailModal.vue` のエラー解消、backend / contract 修正、未実行テスト結果の補完

## Required Stages

- Architect: 完了済み。gallery 分割計画と補助設計メモが存在する。
- UI/UX: FE-G2 から FE-G5 までの current UI 状態を文書へ反映済みとする。
- Implementer: アプリ実装は worktree に存在するが、ユーザー都合でここで一時停止する。
- Reviewer: 正式レビュー未完了。停止時点の interim review を `review-notes.md` に残す。

## Current Status

- 現在ステージ: Implementer blocked
- 状態: local-dev レーンでの再開前提は確認できたが、backend の gallery runtime 不整合で FE-G5 実機確認は停止中。完了扱いではない。
- FE-G1: 実装済み。gallery endpoints、API wrapper、store、types、utils、Nitro proxy handlers、csrf bootstrap support、mocks、basic unit tests を worktree で確認済み。
- FE-G2: 実装済み。`pages/gallery.vue` と `components/gallery/GalleryAssetCard.vue` による一覧 UI、period presets、load more、empty / error / loading states を確認済み。
- FE-G3: 実装済み。`components/gallery/GalleryUsageMeter.vue` と usage refresh 挙動を確認済み。
- FE-G4: 実装済み。`components/gallery/GalleryUploadDialog.vue`、`pages/gallery.vue` の upload CTA、`useGalleryStore.uploadAsset()` の refresh 挙動、i18n 追加を確認済み。
- FE-G5: 部分実装。`components/gallery/GalleryAssetDetailModal.vue` は存在し、`pages/gallery.vue` から起動配線もある。少なくとも race-condition / stale response 対策まで入っている一方、runtime 検証の主ブロッカーは local backend の接続条件と upload 契約ズレに移っているため、完了・検証済みとは扱えない。
- local-dev lane: 既存の `https://pull.log:4649` は `nuxt dev --dotenv .env.local` で起動し、`127.0.0.1:3030` は通常 `.env` の PHP サーバーで起動していることを確認済み。
- local login: frontend proxy 経由で admin / demo / e2e の seeded アカウントが成功することを確認済み。`accounts.md` の admin 更新後パスワードではなく、local seed 側の値が有効だった。
- gallery runtime: `GET /api/gallery/assets`、`GET /api/gallery/usage`、`POST /api/gallery/assets/upload-ticket` は local-dev でいずれも 500。frontend 側ではなく backend の gallery route / controller 解決不整合が主ブロッカーになっている。
- agent-driven verification: local-dev の gallery 到達を再現しやすくするため、Playwright の最小 case `gallery-runtime-smoke` を追加した。初版のスコープは demo ユーザー login、`/gallery` 到達、assets / usage の 200 確認までで、direct upload は対象外とする。

## Blockers and Open Questions

- FE-G5 の主ブロッカーは、もはや VS Code parse / type error を主因として断定しない。detail modal には最小修正が入り、少なくとも stale response と race-condition を避けるための requestId ガードが入っている。
- local-dev レーンそのものは確認済み。`https://pull.log:4649` は `.env.local`、`127.0.0.1:3030` は通常 `.env` で起動し、frontend の `SECRET_API_KEY` と backend の `API_KEY` も一致していた。
- login 401 は今回の local-dev 実機確認では再現していない。認証自体は frontend proxy 経由で成功しており、現時点の主ブロッカーではない。
- 現在の主ブロッカーは backend の gallery runtime 不整合で、`storage/logs/laravel.log` には `App\Http\Controllers\Gallery\GalleryAssetController` と `App\Http\Controllers\Gallery\GalleryUsageController` の BindingResolutionException が出ている。`bootstrap/cache/routes-v7.php` には gallery route が残る一方、現行 `routes/api.php` には gallery route が存在しない。
- `pnpm run test:e2e:prepare` / `composer run e2e:prepare` は E2E 用 DB の再初期化を含むが、`pnpm run test:e2e` 自体は Playwright が `e2e:serve` を起動するだけで、毎回 DB を初期化するわけではない。
- upload の non-mock runtime 検証には別ブロッカーが残る。`frontend/utils/gallery.ts` の direct upload 実装は `x-csrf-token` と `x-upload-token` は送るが `x-api-key` は送っておらず、backend の `POST /gallery/assets` は `auth.apikey` ミドルウェア配下のため、upload-ticket が通る状態へ戻っても direct upload 本体は 401 になり得る。
- upload 完了後の一覧 refresh は store 側で page 1 へ戻す方式のため、無限スクロール途中位置は保持しない。
- unit verification 経路は `vitest.config.ts` 追加と `package.json` への `test:unit` / `vitest` 追加で回復しているが、このメモでは実行結果を確定扱いしない。

## Decision Log

- 2026-04-18:
  - 判断: FE-G4 は単一画像アップロード中心の初期スコープで実装済みとして記録する。
  - 理由: worktree 上で upload dialog、upload CTA、store refresh、i18n 追加、関連 unit test 追加を確認できたため。
  - 次アクション: 実行確認は再開後に行う。
- 2026-04-18:
  - 判断: FE-G5 は「未着手」ではなく「部分実装だが blocked」に修正する。
  - 理由: `GalleryAssetDetailModal.vue` の存在と `pages/gallery.vue` からの接続に加え、stale response / race-condition 対策まで入っている一方、runtime 側では local backend 接続条件と upload 契約ズレが別途ブロッカー化しているため。
  - 次アクション: まず通常 local backend で login を成立させ、その後に detail / save / delete を検証する。upload は別ブロッカーとして後段に切り分ける。
- 2026-04-18:
  - 判断: 現在の状態は completed ではなく paused と明記する。
  - 理由: ユーザーがここで開発を止め、再開用の状態保存を求めているため。
  - 次アクション: resume checklist を起点に作業再開する。
- 2026-04-19:
  - 判断: 通常開発は local-dev レーン、Playwright は e2e レーンへ固定する。
  - 理由: backend 側で local-dev / e2e の運用差分が正式整理され、混線時の login 401 要因が API_KEY 不一致であることが確認できたため。
  - 次アクション: FE-G5 再開時は backend を通常 `.env` で起動し、手動確認を local-dev で進める。
- 2026-04-19:
  - 判断: gallery direct upload は runtime lane 問題とは別の認証ヘッダ課題として扱う。
  - 理由: direct upload 実装が backend 本体 endpoint へ直接 POST しており、その経路では Nitro proxy の `x-api-key` 注入が効かないため。
  - 次アクション: frontend 側で direct upload 経路の `x-api-key` 付与方式を見直す。
- 2026-04-19:
  - 判断: 現在起動中の `https://pull.log:4649` と `127.0.0.1:3030` は local-dev レーンとして扱ってよい。
  - 理由: frontend は `nuxt dev --dotenv .env.local`、backend は通常 `.env` の PHP サーバーで起動しており、API key 前提も一致していたため。
  - 次アクション: lane mismatch ではなく gallery API 自体の runtime 不整合として切り分ける。
- 2026-04-19:
  - 判断: FE-G5 の runtime 検証停止要因は backend gallery route / controller 不整合である。
  - 理由: login は成功した一方で gallery list / usage / upload-ticket がすべて 500 となり、backend ログに GalleryAssetController / GalleryUsageController の解決失敗が出ていたため。
  - 次アクション: backend チームへ local-dev の gallery runtime 復旧を依頼し、復旧後に detail / save / delete を再確認する。
- 2026-04-19:
  - 判断: local-dev の gallery 再疎通確認は Playwright の最小 smoke case を追加して agent-driven に再現可能な形へ寄せる。
  - 理由: 手動では demo ログインから gallery 表示まで通る一方、ad-hoc な agent 確認では認証 bootstrap や再現条件がぶれやすいため。
  - 次アクション: `gallery-runtime-smoke` を chromium で実行し、login / gallery 到達 / assets / usage の結果を report として残す。
- 2026-04-19:
  - 判断: `gallery-runtime-smoke` は Playwright 管理の e2e frontend ではなく、既存 local-dev サーバー (`https://pull.log:4649`) を直接叩く。
  - 理由: repo の既定 runner は `.env.e2e` と `127.0.0.1:43173` を使うため、demo ログイン確認という今回の目的と実行レーンがずれていたため。
  - 次アクション: runner の baseURL override で local-dev を使い、demo_user の login 401 が lane mismatch か本当の認証失敗かを切り分ける。

## Resume Checklist

- backend の gallery route / controller 解決不整合を修正し、`GET /api/gallery/assets` と `GET /api/gallery/usage` が local-dev で 200 になることを確認する。
- `pnpm run test:e2e:case -- gallery-runtime-smoke --project=chromium` を実行し、agent 経路でも local-dev の login と gallery 到達が再現するかを確認する。
- Playwright を使う検証では e2e レーンを使い、必要なときだけ `pnpm run test:e2e:prepare` を先に実行する。
- local-dev の認証確認は済んでいるため、non-demo seeded ユーザーで login が通ることを再前提として扱う。
- `pages/gallery.vue` から詳細モーダルを開き、FE-G5 の detail fetch、save、delete の基本導線を確認する。
- `vitest.config.ts` と `package.json` の unit 経路回復を前提に、`tests/unit/gallery.utils.spec.ts` と `tests/unit/useGalleryStore.spec.ts` の結果を必要に応じて再取得する。
- upload は別ブロッカーとして最後に扱い、non-mock 環境で `x-api-key` を含む direct upload 経路へ修正方針を決める。
- 停止中に drift が増えていないか、gallery 文書と実装の差分を短く再点検する。

## Next Action

- 直近の次アクションは `gallery-runtime-smoke` を実行して local-dev の agent-driven 確認を固めること。これで assets / usage が通れば、同じ環境で FE-G5 の detail / save / delete を再確認し、upload は `x-api-key` 欠落の別ブロッカーとして最後に切り分ける。