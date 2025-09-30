# /stats グリッドを「Z」順に整える

## 現在の状況と課題
- /stats ページでは PC 幅時に CSS Grid の grid-auto-flow: row dense を利用しており、タイル幅の組み合わせによって表示順が再配置される。
- ユーザーが期待する「左上から右へ 6 列 → 次の行へ折り返し」という Z 字の順序と実際の並びが一致しないケースがあり、ドロップ結果が把握しづらい。
- span の合計が 6 を超える場合に次の行へ押し出される仕様が明確になったため、ロジックとスタイルの両面で統一した制御が必要。

## コードベースでの参考情報
- pages/stats.vue 内の getTileSpanClass および layoutStore.setOrder 呼び出し（例: pages/stats.vue:120-210）。
- ssets/styles/_stats.scss の .charts-grid セクションと PC 向けメディアクエリ設定（特に grid-template-columns と grid-auto-flow）。
- stores/useStatsLayoutStore.ts の 	iles 並び順管理と ssignSequentialOrder 実装。

## 解決案（初期案）
- CSS では grid-auto-flow: row dense を外し、明示的に並び替えた順がそのまま描画されるよう grid-auto-flow: row へ変更する。
- span 合計が 6 を超える場合に次行へ送る判定を、フロントでの並び替え処理時に計算し、order を付与する際に行ブレークを考慮する（必要ならタイルごとに grid-column-start を計算）。
- SortableJS の onEnd で取得した順序に対し、Z 順を保つためのバリデーションを挟み、問題がある場合は補正してストアへ反映する。
- 実装後は span パターン（例: 2-2-2, 3-3, 4-2, 3-4 など）で UI を手動検証し、期待通りの折り返しを確認する。

## 対応内容
- 2025-09-29: ssets/styles/_stats.scss の PC 向け .charts-grid で grid-auto-flow を ow dense から ow へ変更し、DOM 順のまま Z 字に並ぶよう調整。
