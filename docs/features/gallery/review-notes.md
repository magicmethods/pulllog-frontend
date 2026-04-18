# Review Notes

## Overview

- feature 名: Gallery interim review at paused state
- reviewer: 未割当
- review date: 2026-04-18 時点の文書整理ベース

## Review Scope

- 対象範囲: frontend workspace 内の gallery 実装状態と gallery 文書の整合確認
- 参照設計: `docs/features/gallery/gallery-plan.md`
- 参照 UI 仕様: `docs/features/gallery/gallery-ui-spec.md`
- 注意: この会話では backend runtime の再実行確認は行っておらず、unit は実行経路回復の確認までを主に扱う

## Must Fix

- local login 401 の原因を先に解消する必要がある。frontend の `.env.local` 前提と backend の `.env.e2e` 前提が衝突すると `API_KEY` が不一致になり、`backend/stable/composer.json` の `e2e:serve` では frontend の通常 local 前提と合わない。
- そのため、再開時は backend を E2E 用ではなく通常 local 起動で整え、seeders を参照した non-demo ユーザーで login を確認してから FE-G5 の detail / save / delete を見るべきである。
- upload の non-mock runtime 検証には別ブロッカーが残る。frontend の direct upload は `x-api-key` を送っておらず、backend の `POST /gallery/assets` は `auth.apikey` ミドルウェア配下のため、upload 本体は 401 になり得る。

## Should Fix

- FE-G5 の主因を parse / type error に固定せず、detail modal には最小修正と stale response / race-condition 対策が入っている前提で runtime 側の検証順序を見直す。
- `vitest.config.ts` 追加と `package.json` への `test:unit` / `vitest` 追加により unit verification 経路は回復しているため、`tests/unit/gallery.utils.spec.ts` と `tests/unit/useGalleryStore.spec.ts` の結果を必要に応じて再記録する。
- non-mock 環境では、まず detail / update / delete / usage refresh を確認し、upload は別ブロッカーとして最後に差分を洗う。

## Nice to Have

- upload 後に一覧を page 1 へ戻す仕様が妥当かを再確認し、必要なら scroll / filter 体験を調整する。

## Final Verdict

- Ship recommendation: pause state saved。現時点では ready to ship ではない。
- Residual risk: local backend 接続条件未整理、upload 契約ズレ未解消、backend 未検証。
- Re-check required: 通常 local backend と non-demo ユーザー login を確認した後に、FE-G5 の detail save / delete、一覧 refresh、usage refresh、ロケール文言を再確認する。upload は最後に別ブロッカーとして確認する。