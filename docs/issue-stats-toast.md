# /stats バージョン競合時にトーストが表示されない

## 現在の状況と課題
- user_filters.version をサーバー側で意図的に変更すると、フロントの PUT リクエストが 409 を受けるが、想定していた stats.layout.toast.conflict のトーストが表示されない。
- 同様に GET が 403 を返したケースでも orbidden トーストが発火しないとの報告がある。
- 現状のハンドリングでは stores/useStatsLayoutStore.ts の pushRemoteState / syncFromServer で ApiError を捕捉しているが、useAPI().callApi の内部処理との整合性が不透明で、トーストがスキップされている可能性がある。

## コードベースでの参考情報
- stores/useStatsLayoutStore.ts 内の pushRemoteState, esolveConflict, showConflictWarning, showForbiddenError。
- composables/useAPI.ts の handleErrorResponse と callApi エラーロジック（ApiError の生成箇所）。
- i18n/locales/{ja,en,zh}.ts の stats.layout.toast 文言定義。
- docs/issue-bug.md に記録されている再現手順とサーバー側レスポンス構造。

## 解決案（初期案）
- callApi 内で 409 を捕捉した際に ApiError が error.data を保持しているか確認し、parseConflictResponse が期待する latestVersion/payload キーと整合するようガードを追加する。
- pushRemoteState の catch ブロックで error instanceof ApiError を判定した後、error.status === 409 の時点で esolveConflict を必ず呼び出し、トースト表示が保証されるようフローを整理する。
- 必要であれば useAPI に 409 専用のイベントハンドラを追加し、呼び出し元へ詳細なエラー情報を返す。
- エラー発生時に一時的なログ出力（開発時限定）を追加し、挙動確認を容易にする。

## 対応内容
- 2025-09-29: stores/useStatsLayoutStore.ts の 409 応答処理を調整。parseConflictResponse で JSON 文字列/latest_version 形式にも対応し、競合情報が取得できない場合でもトーストを表示するように esolveConflict のフォールバックを追加。
- 2025-09-30: stores/useStatsLayoutStore.ts に group: "notices" を追加してグローバル Toast と連携しつつ、トーストヘルパー全体で共通グループ定数を使用するよう更新。

## 現在の状況と課題（2025-09-30）
- 409エラー時のトースト表示はまだ動作していない。
  - 409エラー時のコンソールエラーのスタック:
  `
  PUT https://localhost:4649/api/user-filters/stats 409 (Conflict)
  
  fetchWithTimeout	@	useAPI.ts:59
  callApi	@	useAPI.ts:180
  pushRemoteState	@	useStatsLayoutStore.ts:209
  (anonymous)	@	useStatsLayoutStore.ts:260
  setTimeout		
  scheduleSync	@	useStatsLayoutStore.ts:259
  watch.deep	@	useStatsLayoutStore.ts:455
  Promise.then		
  setOrder	@	useStatsLayoutStore.ts:350
  onEnd	@	stats.vue:145
  `
  そもそも useAPI.ts:59 で処理が中断している？
  - toast.add() の引数オプションに group: "notices" がないためグローバルに設置しているトーストコンポーネントがオプションを拾えない。（これがトーストが表示されない直接的な原因だろう）
