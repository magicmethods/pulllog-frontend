背景
- 統計ページのチャートタイルに対するサイズ変更・並び替え・表示切替の要望があり、既存の `docs/edit-stats-layout.md` で仕様が確定した。
- 将来的に統計フィルターも同一設定領域に統合する計画があるため、拡張性を考慮した実装が必要。

目的
- pages/stats.vue のチャートレイアウトをユーザーが柔軟に調整できるようにし、設定を端末間で将来的に同期可能な形で保存する。

対象
- フロントエンド: `pages/stats.vue`, `stores/useStatsLayoutStore.ts`, `components/chart/*`
- バックエンド連携（プレースホルダ）: Laravel API `user_filters` エンドポイント
- ドキュメント: `docs/edit-stats-layout.md`

スコープ（実装）
- 各タイルにサイズ選択（最小/小/中/大/最大の 5 段階・span=2〜6）、表示切替、ドラッグモード切替の 3 アイコンを追加。
- モバイル（md 未満）はサイズ変更不可・表示幅は常に最大（span=6）。タブレット（md 以上 lg 未満）はサイズ選択肢を「小（span=3）」「最大（span=6）」の 2 段階に制限し、lg 以上では span=2〜6 の 5 段階を選択可能にする。
- SortableJS を用いてフィールド内および詳細設定モーダル内で並び替え可能にする。ドラッグモード有効時はタイルにハンドルクラスを付与。
- 非表示タイルの再表示は「詳細設定」モーダル（PrimeVue Dialog）から行えるようにし、チェックボックスで可視性を切替。
- 詳細設定モーダルではチャート一覧を現行レイアウト順で表示し、既存 i18n ラベルを利用。SortableJS での並び替えと「適用する」ボタンによる一括反映を実装。
- 「適用する」後に同期が失敗した場合はトーストでエラーを表示し、ストア/LocalStorage を直前の状態へロールバック。
- フィールド側の非表示ボタンにはツールチップで「再表示する場合は『詳細設定』から設定してください」を表示。

状態管理・永続化
- `useStatsLayoutStore` を拡張し、`TileConfig` に `size`, `visible`, `locked` を保持。`DEFAULT_STATS_TILES` を定数化。
- localStorage キー `pulllog.statsLayout.v1` で `StatsLayoutState` を保存。初期化時に LocalStorage → API（将来）→ デフォルトの順で適用。
- ストア更新を監視して localStorage を即時更新し、API 実装後は 500ms デバウンスで `PUT /api/user-filters/stats` を送信。
- API 409/失敗時はトースト通知（「表示設定の読み込みに失敗しました」「設定の保存に失敗しました。設定内容を適用することができませんでした」）を表示し、必要に応じてリセット/ロールバック。

バックエンド連携（準備）
- `user_filters` テーブルを `user_id + context` でユニーク化し、`layout`, `filters`, `version` を JSON で保持。
- 利用予定 context: `stats`, `apps`, `history`, `gallery`。
- エンドポイント: `GET /api/user-filters/{context}`, `PUT /api/user-filters/{context}`（いずれも Laravel 実装予定）。

非機能・規約
- TypeScript（4 スペース・セミコロン省略）、`any` 禁止、非 null アサーション禁止、JSDoc 必須。
- API 通信は `fetch` を使用。`console.log` を残さない。
- tailwind ユーティリティを優先し、独自 CSS は最小限。

動作確認
- PC/タブレット/スマホ幅でサイズ選択 UI の制限と挙動を確認。
- 並び替え・サイズ変更・表示切替が localStorage に保存され、リロード後も再現されること。
- 詳細設定モーダルでのチェックボックス・並び替え・適用処理が期待通り動作すること。
- ドラッグモード有効化時のビジュアル変化とハンドル動作、非表示ボタンのツールチップ表示を確認。
- API 失敗時のトーストとロールバック（モックまたはユニットテストで再現）。

受け入れ基準（DoD）
- `docs/edit-stats-layout.md` に記載の仕様が全て実装されている。
- localStorage 初期化・デバイス幅別挙動・詳細設定モーダル操作が手動確認済み。
- 将来の API 連携を想定したストア構成と同期キューが実装されている（API コールは feature flag で切替可能）。
- pnpm build が成功し、関連差分に lint エラーが無い。
- PR には手動確認手順とトースト表示のスクリーンショット（PC/モバイル）を添付する。
## 実装補足
- 表示コントローラUIは `components/DisplayControllerUI.vue` に共通化し、各チャートカードのタイトル内部に配置する。
- 詳細設定モーダルは `components/AdvancedSettingsModal.vue` として分離し、タイルの可視性と並び順の編集を担う。
