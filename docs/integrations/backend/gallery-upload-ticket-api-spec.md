# BE-GALLERY-UPLOAD-TICKET: ギャラリーアップロード用一時トークン API 追加

## 背景
- フロントエンドでは大容量の画像アップロードを Nitro 経由にせず、ブラウザから `https://api.pulllog.net/api/v1/gallery/assets` へ直接送信する設計に変更する。
- `SECRET_API_KEY` をクライアントへ露出せずに直接アップロードを許可するため、バックエンド側で短時間有効なアップロード専用トークン（uploadTicket）を発行するエンドポイントが必要。
- このトークンを利用してアップロード時に CSRF + 署名検証を行い、帯域負荷を Nitro から切り離しつつ安全性を維持する。

## 実装対象
- ルート: `POST /api/v1/gallery/assets/upload-ticket`
- コントローラ: `GalleryAssetController@uploadTicket`（仮）
- リクエストバリデーション: 新規 FormRequest（`StoreUploadTicketRequest` など）
- Config/Env: `config/gallery.php` に `upload_ticket_ttl` を追加し、`.env.example` に `GALLERY_UPLOAD_TICKET_TTL=60` を追記
- テスト: `tests/Feature/Gallery/GalleryUploadTicketTest.php`

## リクエスト仕様
- 認証: 既存 API と同様に `x-api-key`（Workers 経由で付与）、CSRF/セッション認証必須。
- HTTP ヘッダ:
  - `x-csrf-token`: 必須
  - `x-api-key`: バックエンド側で通常どおり検証
- ペイロード(JSON):
  ```json
  {
    "fileName": "optional-string",
    "expectedBytes": 1048576,
    "mime": "image/jpeg",
    "visibility": "private",
    "logId": 123,
    "tags": ["string"]
  }
  ```
  - `fileName`, `expectedBytes`, `mime` は任意だが、提供された場合はプラン上限／MIME 許可リストに対する事前バリデーションを行う。
  - `visibility`/`logId`/`tags` はアップロード時に利用予定の値を想定。未指定時はデフォルトを適用。

## レスポンス仕様
ステータス 200 / JSON:
```json
{
  "uploadUrl": "https://api.pulllog.net/api/v1/gallery/assets",
  "token": "signed-opaque-token",
  "expiresAt": "2025-10-09T13:12:27.393Z",
  "maxBytes": 314572800,
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png",
    "image/webp"
  ],
  "headers": {
    "x-upload-token": "signed-opaque-token"
  },
  "meta": {
    "visibility": "private",
    "logId": 123,
    "tags": ["string"]
  }
}
```
- `token` は単回利用または `upload_ticket_ttl`（デフォルト 60 秒）で失効。
- `maxBytes` や `allowedMimeTypes` は現在のユーザープランとギャラリー設定から算出。
- `headers` フィールドにアップロード時に付与すべき追加ヘッダを明示（現状は `x-upload-token` のみ）。
- `meta` はフロントがフォーム生成時に利用する想定値。バックエンドが必要と判断する場合のみ返却し、必須ではない。

## 挙動
1. リクエスト受信後、ユーザーの CSRF/セッション/`x-api-key` を検証。
2. `expectedBytes` と MIME（指定がある場合）を用いてプラン上限／許可 MIME をチェックし、違反時は 422/403 を返却。
3. 署名付きトークンを発行。トークンには以下を含める:
   - `user_id`
   - `expires_at`
   - `max_bytes`
   - `visibility`, `log_id`, `tags`（指定がある場合）
   - リプレイ防止のための一意キー（例: UUID）
4. トークン情報を `cache` or `gallery_upload_tickets` テーブルに保存（TTL 管理）し、レスポンスを返却。
5. 既存の `POST /api/v1/gallery/assets` では `x-upload-token` ヘッダを検証:
   - 未指定／失効／再利用の場合は 401（`message`: `Invalid upload token`）。
   - 正常時は従来処理（ファイル保存、重複チェック）を継続し、終了後にトークンを無効化。

## エラー応答
- 401 Unauthorized: トークン検証失敗、CSRF エラー。
- 403 Forbidden: プラン上限を超えると予測される場合。
- 422 Unprocessable Entity: MIME 未対応、リクエストパラメータ不備。
- 429 Too Many Requests: 短時間の連続発行制限（必要なら実装）。

## セキュリティ・運用
- `GALLERY_UPLOAD_TICKET_TTL` のデフォルトは 60 秒。環境によって調整可能。
- Nitro 側では `/api/v1/gallery/assets/upload-ticket` のみプロキシ。アップロード本体は CDN を通らずに直接 `uploadUrl` へ。
- ログ出力: 発行時・検証失敗時に監査ログを残す。
- 将来の S3 直送に備え、`uploadUrl` は環境ごとに変更可能な設計とする。

## 受け入れ条件
- 正常系: 正しいリクエストで 200 / JSON が返る。`token` をアップロードで使用すると 201 を取得でき、使用済みトークンは再利用不可。
- 異常系: 失効トークン・再利用トークン・上限超過予測・MIME 不一致で適切なエラーコードが返る。
- テスト: Feature テストで発行→アップロード→無効化までの流れ、バリデーションエラー、TTL 超過をカバー。

## 連携メモ
- フロントエンド（FE-G1）ではこのエンドポイントを `server/api/gallery/assets/upload-ticket.post.ts` から呼び出し、レスポンスに基づいて直接アップロードを実行する。
- チケットのメタ情報はアップロードリクエストの FormData にも同梱するため、既存 `store()` 処理を変更する必要はない。
