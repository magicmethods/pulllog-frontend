# /stats ドラッグ後に現れる複製タイルを解消する

## 現在の状況と課題
- 最終行末尾へタイルをドロップすると、同じ見た目で中身のないタイルが新しい行に複製される事象が再現している。
- 複製タイルはリフレッシュ操作や再ドロップで消えるが、ユーザー体験を損ない、並び順の保存にも影響する恐れがある。
- 既存対応で allbackOnBody / emoveCloneOnHide を有効化済みだが、依然として残留するパターンがあるため根本調査が必要。

## コードベースでの参考情報
- plugins/sortable.client.ts で定義している共通 Sortable オプション。
- pages/stats.vue の initGridSortable / destroyGridSortable / umpLayoutKey と、ドラッグモード切り替えのライフサイクル処理。
- ssets/styles/_stats.scss の .stats-drag-ghost などドラッグ時スタイル。
- components/AdvancedSettingsModal.vue のモーダル側 Sortable 実装（再現条件比較用）。

## 解決案（初期案）
- SortableJS の clone 機能を無効化する設定や orceFallback の挙動確認を含め、オプションパラメータ（allbackClass, ghostClass など）の再調整を行う。
- onEnd 後に 
extTick で DOM を再走査し、stats-drag-ghost もしくは空チャートを検出した場合に再初期化 or タイルリスト再適用を実施する。
- umpLayoutKey() による強制再レンダーが Sortable のクローン管理と競合している可能性があるため、ドラッグ中はキー更新を抑止するなどの対策を検討する。
- 手元で再現させた際のスクリーンショットや DOM 構造を採取し、原因特定に役立つログを整備する。

## 対応内容
- 2025-09-29: pages/stats.vue のレイアウト変更監視処理で、タイルの並び替えのみが行われた場合は umpLayoutKey() を呼ばず、サイズ/表示変更など構造が変わった場合だけ再マウントするよう修正。これにより SortableJS のクローンが残るケースを抑制。
