# FE-G5 資産詳細・編集/配信強化（FE-005・FE-006・FE-009統合）

## 背景
- 資産詳細モーダルや編集/削除フローが存在せず、一覧ページからの閲覧完結ができない。
- 署名付きURLの TTL（標準 120 秒）の再取得、visibility 切り替え、private/unlisted 向けのダウンロード導線・共有リンク仕様が未定義。
- ログ紐付け変更は初期リリースでは見送り予定だが、将来的な拡張に備えた UI 設計が求められる。

## 対応範囲
- `components/gallery/GalleryAssetDetailModal.vue`（新規）で詳細表示・編集フォーム・削除確認をまとめて実装。
- `GET /gallery/assets/{id}` の取得・自動リフレッシュ（TTL 満了検知時の再フェッチ）ロジックを組み込む。
- Visibility（public/private/unlisted）の更新、タイトル・説明・タグの編集、削除、再発行ボタンによる署名付きURL取得を実装。
- ダウンロード／共有導線（リンクコピー・TTL 表示）を UI に追加し、アクセス権限チェッカーを設計。
- プレースホルダ画像／透かし表示（`url` が `null` の場合）を統一的に扱う。

## 主なタスク
- TTL 検知ロジック（レスポンスの `expiresAt` もしくは `Date.now()` + TTL）を整理し、再フェッチ時のスロットリングを実装。
- Visibility 更新 API (`PATCH /gallery/assets/{id}`) のペイロード設計とエラー表示。
- 削除時の確認モーダルと二重送信防止策を実装。
- private/unlisted 資産のダウンロードリンク再発行時に、使用量や一覧のサムネイルがどう刷新されるかを定義。
- 詳細モーダルを `pages/gallery/index.vue` と連携し、URL クエリ（`?assetId=`）で直接表示できるようにするか検討。

## 想定変更ファイル
- `components/gallery/GalleryAssetDetailModal.vue`（新規）
- `components/gallery/GalleryAssetActions.vue`（任意）
- `stores/useGalleryStore.ts`
- `composables/useGalleryApi.ts`
- `pages/gallery/index.vue`
- `i18n/locales/ja.ts`

## 確認事項
- TTL 情報は API から `expiresAt` などの明示的なタイムスタンプが提供されますか？ それともフロント側で推定する必要がありますか？
- private/unlisted の共有リンクはコピー用ボタンがあれば十分ですか？ メール送信や QR コードなど追加導線は想定していますか？
- 削除・更新時の監査ログ／トースト文言に既存のトーン&マナー指針はありますか？
- ログ紐付け UI は初期リリースで完全に非表示にしてよいですか？ 将来対応を見据えてプレースホルダを残すべきでしょうか？
- 署名付きURL再発行ボタンのレートリミットや確認ダイアログが必要かどうか、ご希望があれば共有ください。

