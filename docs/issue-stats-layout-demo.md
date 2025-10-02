# デモユーザーのログイン時は /stats のレイアウト設定等をバックエンドDBに保存しない。

## 背景
- デモユーザーはゲスト訪問者に広く開放しているため、レイアウト設定等を user_filters テーブルへ保存して永続化してしまうとユーザー体験に偏りが生じてしまう。
- デモユーザーの場合でも、レイアウト設定等をクライアント側（ localStorage ）へ保存するのは有効とする。同じデモユーザー間でも差分が永続化できるため。

## 要件
- 環境変数 `USE_FEATURE_FLAG=true` かつ `NEW_FEATURES=StatsLayoutSync` で featureFlag の StatsLayoutSync が有効の場合であっても、認証ユーザーがデモユーザーの時は、GET|PUT /user-filters/{context} のAPIルートを使用せずに、 localStorage とのみ永続データのやり取りを行う。
- デモユーザーかどうかの判定は `const isDemoUser = computed(() => userStore.hasUserRole("demo"))` で行う。

## 手順
1. 本 docs/issue-stats-layout-demo.md の課題にて、対応にあたって不明点や確認事項があれば下記「確認事項」セクションに追記してください。確認後、私の方で回答を追記します。
2. 確認事項がクリアになった時点で、本課題の詳細をまとめて `gh` コマンドを使ってGithubにIssueとして登録してください。 `gh` コマンドが使用できない場合は登録内容を通知してください。私の方で手動登録します。
3. Github Issue が登録されたら、 AGENTS.md の方針に沿って実装対応を行ってください。対応するブランチは dev ブランチから新たに作成してください。
4. 実装・テストが完了したら、対応内容を本 docs/issue-stats-layout-demo.md に追記して、通知してください。私の方で動作確認を行います。動作確認結果は本 docs/issue-stats-layout-demo.md に追記します。不具合がある場合は 3. に戻って不具合がなくなるまで繰り返します。
5. 動作確認が正常完了した時点でコミットとPR作成を依頼します。 `gh` コマンドで対応してください。 `gh` コマンドが使用できない場合はコミットメッセージとPR内容を通知してください。私の方で手動で行います。
6. PRがマージされ、GithubのIssueがクローズされたら本タスクは終了です。

## 確認事項
- なし

## 対応内容
- 2025-10-02: Issue #17 を起票。stores/useStatsLayoutStore.ts で demo ロールを判定する computed を追加し、canSyncRemote から /user-filters API 呼び出しを除外して localStorage 永続のみとなるよう更新。

## 動作確認
- 2025-10-02: `pnpm exec biome check stores/useStatsLayoutStore.ts`（エラーなし）。
- ブラウザ経由でのデモユーザー操作は未検証（バックエンド API 接続環境がないため）。
