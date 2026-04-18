# FE-G1 ギャラリーAPI基盤整備（FE-001・FE-008統合）

## 背景
- 現行フロントは `useAPI`／`useCsrfStore` で CSRF リフレッシュや API プロキシを扱っているが、ギャラリー領域のエンドポイント・型・ストアは未整備。
- バックエンドは `/v1/gallery/assets`・`/v1/gallery/usage` を提供済みのため、Nuxt 側でのプロキシ実装と型定義を先に揃える必要がある。
- 認証ヘッダの統一適用（`x-api-key`／`x-csrf-token`）と `api-schema.yaml` の最新化により、以降のUI開発を安全に進める土台を作る。

## 対応範囲
- `api/endpoints.ts` にギャラリー系エンドポイントを追加。
- `server/api/gallery/**` 配下に Nitro プロキシ（list/detail/create/update/delete/usage）を実装し、`buildProxyHeaders` 等の共通ユーティリティを再利用。
- `types/gallery.ts`（新規）で `GalleryAsset`, `GalleryAssetListParams`, `GalleryUsage`, `GalleryVisibility` などの型を定義。
- `stores/useGalleryStore.ts`（新規）および `composables/useGalleryApi.ts`（任意）で一覧・詳細・使用量のフェッチ骨組みを作成し、エラーハンドリングや CSRF リトライに対応。
- `api-schema.yaml` のギャラリーセクションをバックエンド最新版へ追随（自動生成は行わずスキーマ差分のみ反映）。
- `.env.example` / `nuxt.config.ts` の公開・秘密キー設定をレビューし、`SECRET_API_KEY` など必要な環境変数の説明を補足。

## 主なタスク
- 既存の `useAPI`／`useCsrfStore` のロジックとテストケースを確認し、ギャラリー用の追加要件（例: 長尺リクエストのタイムアウト設定）を整理。
- 新規 Nitro ルート（例: `server/api/gallery/assets/index.get.ts`, `server/api/gallery/assets/[id].get.ts`, `.../[id].patch.ts`, `.../[id].delete.ts`, `server/api/gallery/usage.get.ts`）を追加。
- 型・ストアで利用する共通インターフェースを `types/` フォルダに切り出し、i18n キーとの整合をチェック。
- Pinia ストアで認証情報の欠如（CSRF 不在）時のエラーと `navigateTo(ERROR_URL.SessionExpired)` の動作を確認。
- `api-schema.yaml` のギャラリー部分を差分取り込み（例: `GalleryAsset`, `GalleryUsage` など）し、手動レビューの手順を `.codex/` などにメモ。
- 直接アップロードに切り替えるための設定・API呼び出しオプション（Nitro 経由の除外リスト、直アクセス時のヘッダ注入、進捗計測手段）を整理。
- アップロード用の一時トークン発行フロー/Nitro 側の軽量エンドポイントを設計し、帯域を消費しない形で API キー秘匿と CSRF 保護を両立させる。

## 想定変更ファイル
- `api/endpoints.ts`
- `server/api/gallery/**`
- `stores/useGalleryStore.ts`（新規）
- `composables/useGalleryApi.ts`（新規・任意）
- `types/gallery.ts`（新規）
- `docs/features/gallery/implementation-plan.md`（進捗更新時）
- `api-schema.yaml`

## 確認事項・回答
- CSRF トークンは現在メモリ保持のみだが、リロード耐性のためにセッションストレージ等へ保存しますか？
  - 回答: セッションストレージに CSRF トークンを保存するのは漏洩時のセッションハイジャックのリスクが増加するのでしたくない。リスク回避の施策があるのであれば検討するが、回避案はありますか？  
  - 提案: CSRF トークンはこれまで通りメモリに限定し、ページロード直後に `remember_token`（HttpOnly）を利用した `/auth/csrf/refresh` 呼び出しで自動再取得する初期化フロー（`csrfStore.bootstrap()` など）を追加します。これによりリロード後も最小限の API コールで復旧しつつ、ブラウザストレージへの平文保存を避けられます。
    - 回答: Okです。この提案を採用します。
- ギャラリーAPIのベースパスはバックエンドと同じく `/v1/gallery` 固定で問題ないか？ サブパス追加の予定はありますか？
  - 回答: `/v1/gallery` 固定で問題ない。サブパス追加の予定はない。
- `GalleryAsset` のタグ情報は初期リリース時点で非対応扱いだが、レスポンス項目として保持して問題ないか？
  - 回答: レスポンス項目に保持してOk。
- `api-schema.yaml` の更新手順はフロント担当が直接行う想定で良いか、それともバックエンド提供差分をインポートするフローにしますか？
  - 回答: 現在コードベースに設置した `api-schema.yaml` がバックエンド側の仕様を反映した最新版なので参照用として利用して欲しい。ただし、この `api-schema.yaml` はフロントエンドのリポジトリでは管理しないので、コミットはしないこと。
- 新規ストア／コンポーザブルの単体テスト（Vitest）はこの段階で追加しておくべきか、後続Issueでまとめて対応しますか？
  - 回答: この段階で追加する。

## 重要事項
- ギャラリー用の Nitro ルート（APIプロキシ）から画像ファイルのアップロードルート（POST）は除外したい。ファイルのアップロードの頻度によってはSSR帯域占有により Cloudflare Workers の接続時間制限の超過発生によりSSRアクセス全体がエラーになることを回避したい。そのため、帯域量が多くなることが想定されるルートは Nitro ルートを経由せずに直接バックエンドAPI `https://api.pulllog.net/api/~` へリクエストさせたい。この仕様を踏まえて再設計して欲しい。
- 直アクセスに切り替える際も `SECRET_API_KEY` をフロントへ露出しないことが必須。SSG/SSR 帯域を使わない軽量 Nitro エンドポイントでアップロード専用の一時署名（`uploadTicket`）を取得し、それを用いてブラウザが直接 `https://api.pulllog.net/api/v1/gallery/assets` 等へ `fetch` を行うアーキテクチャを採用する。
- 一時署名はシングルショット or 短時間有効のトークンとし、アップロード完了後は失効する運用をバックエンドと調整する。

## 仕様再設計案
1. **プロキシ経由の対象ルート整理**  
   - Nitro 経由: `GET /gallery/assets`, `GET /gallery/assets/{id}`, `PATCH /gallery/assets/{id}`, `DELETE /gallery/assets/{id}`, `GET /gallery/usage` など帯域の小さい操作。  
   - 直アクセス: `POST /gallery/assets`（単体/複数アップロード）。必要に応じて将来の大量データ PUT/POST もリスト化。

2. **一時アップロードトークンフロー**  
   - フロントは Nitro ルート `POST /api/gallery/assets/upload-ticket`（仮）にリクエスト。Nitro は `SECRET_API_KEY` を付与してバックエンド `/v1/gallery/assets/upload-ticket` を呼び出し、`uploadUrl`, `token`, `expiresAt`, `maxBytes` 等を受け取る。  
   - ブラウザは `fetch(uploadUrl, { headers: { 'x-upload-token': token, 'x-csrf-token': csrf } })` で直接アップロード。大容量 FormData の送信も Nitro を経由しないため、Workers の帯域を圧迫しない。  
   - 成功後は Nitro を介さずともバックエンドから 201 レスポンスが返る想定。戻り値（新規 `GalleryAsset`）が必要な場合は直後に Nitro 経由の `GET /gallery/assets/{id}` で取得。

3. **`useAPI` / `useGalleryApi` の拡張**  
   - オプション `transport: "proxy" | "direct-upload"` を追加し、`"direct-upload"` の場合は `apiProxy` の代わりに `useRuntimeConfig().public.directApiBaseURL` を利用。  
   - 直アクセス時は `x-api-key` を付与しない（API キーはアップロードチケット内に埋め込む）。CSRF トークンのみフロントから送信し、チケットの署名検証で API 側が保護する。

4. **CSRF 初期化フローの追加**  
   - アプリ起動時（`app.vue` or プラグイン）に `csrfStore.bootstrap()` を実装。`remember_token` Cookie があれば即座に `/auth/csrf/refresh` を呼び出し、CSRF トークンをメモリへ再設定。Cookie が無い場合はログイン画面へ誘導。  
   - この処理により CSRF をブラウザストレージに保存せずともリロード耐性を確保する。

5. **テスト方針**  
   - `useGalleryStore`／`useGalleryApi` に対する Vitest で、直アクセス設定時に `fetch` が `directApiBaseURL` を指すこと、一時トークン未取得時にエラーを返すこと等を確認。  
   - Nitro ルートのユニットテスト（`nitropack` テストユーティリティ or `supertest` 相当）で、`upload-ticket` エンドポイントが正しくバックエンドを呼び出し `x-api-key` を付与することを検証。

## 追加確認事項
- アップロード用の一時トークン生成エンドポイント（`/v1/gallery/assets/upload-ticket` 等）は既にバックエンドに存在しますか？ 未実装の場合、必要なレスポンス構造と失効ポリシーを定義したいです。
  - 回答: 一時トークン生成エンドポイントはバックエンドAPIに未実装です。追加実装用のIssueとして必要なレスポンス構造と失効ポリシーを定義してください。
- 直アクセス時のレスポンスで新規 `assetId` を返す想定でしょうか？ 返る場合はそのまま利用し、返らない場合は後続の `GET` で補完します。
  - 回答: はい、直アクセスでのアップロードのレスポンスには `assetId` が含まれる想定です。 `POST /gallery/assets` の201レスポンス（アップロード成功時）としては下記のようなJSON形式を想定しています。
  ```json
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "userId": 0,
    "logId": 0,
    "disk": "string",
    "path": "string",
    "url": "string",
    "thumbSmall": "string",
    "thumbSmallUrl": "string",
    "thumbLarge": "string",
    "thumbLargeUrl": "string",
    "mime": "string",
    "bytes": 0,
    "bytesThumbSmall": 0,
    "bytesThumbLarge": 0,
    "width": 0,
    "height": 0,
    "hashSha256": "string",
    "title": "string",
    "description": "string",
    "tags": [
        "string"
    ],
    "visibility": "private",
    "createdAt": "2025-10-09T13:12:27.393Z",
    "updatedAt": "2025-10-09T13:12:27.393Z",
    "deletedAt": "2025-10-09T13:12:27.393Z"
  }
  ```
  `id` が `assetId` となります。
- アップロードサイズ上限や MIME チェックのエラーが発生した場合、バックエンドは JSON で返却しますか？ それともステータスのみ（例: 413）で返るため、フロントでの補助文言が必要でしょうか？
  - 回答: エラー時はステータスコードに、エラーメッセージを含むJSONオブジェクトが含まれます。フロントでの補助文言は不要です。
- アップロードチケットの有効期限は何秒程度を想定されていますか？（UI で再リクエストのタイミング調整が必要です）
  - 回答: 60秒程度を想定。環境変数で定義したいが、これはバックエンド側の .env で定義するべきだろうか？  
  - 対応方針: バックエンド側で `GALLERY_UPLOAD_TICKET_TTL=60`（秒）を `.env` に定義し、config 経由で制御する方針で Issue 化します。
- token の送信ヘッダ名は x-upload-token で確定してよいでしょうか？
  - 回答: x-upload-token で確定して良いです。
- フロントからの FormData には title や visibility などメタ情報も同梱予定です。負荷分散を考慮し、バックエンドで一括受け入れできることを確認したいです。
  - 回答: バックエンドのアップロードデータの受け入れを担うコントローラでは一括受け入れをしている。抜粋コードは下記の通り。
  ```php
  public function store(
    StoreGalleryAssetRequest $request,
    GalleryStorage $storage,
    PlanLimitService $planLimitService
  ) {
    $user = $request->user();
    $file = $request->file('file');

    $limits = $planLimitService->getGalleryLimitsForUser($user->id);
    $usageRow = DB::table('gallery_usage_stats')->where('user_id', $user->id)->first();
    $usedBytes = (int) ($usageRow->bytes_used ?? 0);
    $maxBytes = (int) $limits['max_gallery_bytes'];

    $originalBytes = $file->getSize() ?: 0;
    $estimate = $originalBytes
        + (int) round($originalBytes * config('gallery.estimate_ratio.small', 0.08))
        + (int) round($originalBytes * config('gallery.estimate_ratio.large', 0.20));

    if ($usedBytes + $estimate > $maxBytes) {
        return response()->json([
            'message' => 'Storage quota exceeded',
            'usedBytes' => $usedBytes,
            'maxBytes' => $maxBytes,
        ], 403);
    }

    $hash = hash_file('sha256', $file->getRealPath());
    $duplicate = GalleryAsset::where('user_id', $user->id)
        ->where('hash_sha256', $hash)
        ->whereNull('deleted_at')
        ->first();

    if ($duplicate) {
        return response()->json([
            'message' => 'Duplicate file',
            'asset' => new GalleryAssetResource($duplicate),
        ], 409);
    }

    $logId = $request->input('log_id');
    if ($logId !== null) {
        $log = Log::where('id', (int) $logId)
            ->where('user_id', $user->id)
            ->first();
        if (!$log) {
            return response()->json([
                'message' => 'Log not found for user',
            ], 422);
        }
    }

    $disk = config('gallery.disk');
    $baseDir = config('gallery.base_dir');

    $saved = null;
    $asset = null;

    try {
        $saved = $storage->saveWithThumbnails($file, $disk, $baseDir);

        $finalTotal = $saved['bytes']
            + (int) ($saved['small']['bytes'] ?? 0)
            + (int) ($saved['large']['bytes'] ?? 0);

        if ($usedBytes + $finalTotal > $maxBytes) {
            $this->deleteStored($disk, $saved);
            $saved = null;

            return response()->json([
                'message' => 'Storage quota exceeded (final check)',
                'usedBytes' => $usedBytes,
                'maxBytes' => $maxBytes,
            ], 403);
        }

        $asset = DB::transaction(function () use ($request, $user, $hash, $disk, $saved, $logId) {
            return GalleryAsset::create([
                'user_id' => $user->id,
                'log_id' => $logId !== null ? (int) $logId : null,
                'disk' => $disk,
                'path' => $saved['path'],
                'thumb_path_small' => $saved['small']['path'] ?? null,
                'thumb_path_large' => $saved['large']['path'] ?? null,
                'mime' => $request->file('file')->getMimeType() ?? 'application/octet-stream',
                'bytes' => (int) $saved['bytes'],
                'bytes_thumb_small' => (int) ($saved['small']['bytes'] ?? 0),
                'bytes_thumb_large' => (int) ($saved['large']['bytes'] ?? 0),
                'width' => (int) $saved['width'],
                'height' => (int) $saved['height'],
                'hash_sha256' => $hash,
                'title' => $request->input('title'),
                'description' => $request->input('description'),
                'tags' => $request->input('tags', []),
                'visibility' => $request->input('visibility', 'private'),
            ]);
        });
    } catch (Throwable $e) {
        if ($saved !== null) {
            $this->deleteStored($disk, $saved);
        }

        throw $e;
    }

    return (new GalleryAssetResource($asset))
        ->response()
        ->setStatusCode(201);
  }
  ```
