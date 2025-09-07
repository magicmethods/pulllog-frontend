import { useCsrfStore } from "~/stores/useCsrfStore"
import { ApiError, ERROR_URL } from "~/utils/error"

const apiCache = new Map<string, { timestamp: number; data: unknown }>()

export function useAPI() {
    const appConfig = useConfig()
    const apiProxy = appConfig.apiProxy ?? "/api"
    //const apiBaseURL = appConfig.apiBaseURL ?? ''
    const mockMode = appConfig.mockMode ?? false
    const csrfStore = useCsrfStore()

    // ユーティリティ
    function createQueryParams(params: RequestParams): string {
        const sp = new URLSearchParams()
        for (const key in params) {
            const v = params[key]
            if (v === undefined || v === null) continue
            if (Array.isArray(v)) {
                for (const x of v) sp.append(key, String(x))
            } else {
                sp.append(key, String(v))
            }
        }
        return sp.toString()
    }

    // キャッシュキー生成
    function stableStringify(obj: Record<string, unknown>): string {
        const sorted = Object.keys(obj)
            .sort()
            .reduce(
                (acc, k) => {
                    // biome-ignore lint:/suspicious/noExplicitAny
                    ;(acc as any)[k] = (obj as any)[k]
                    return acc
                },
                {} as Record<string, unknown>,
            )
        return JSON.stringify(sorted)
    }
    function generateCacheKey(options: CallApiOptions): string {
        const { endpoint, method, params } = options
        return `${method}:${endpoint}:${params ? stableStringify(params) : ""}`
    }

    // タイムアウト付きfetch
    async function fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeoutSec: number,
    ): Promise<Response> {
        const controller = new AbortController()
        const timeoutId = setTimeout(
            () => controller.abort(),
            timeoutSec * 1000,
        )
        try {
            return await fetch(url, { ...options, signal: controller.signal })
        } finally {
            clearTimeout(timeoutId)
        }
    }

    // メインAPI呼び出し
    async function callApi<T = unknown>(
        options: CallApiOptions,
    ): Promise<T | null> {
        const {
            endpoint,
            method,
            params,
            data,
            retries = 0,
            cacheTime = 0,
            overrideURI = false, // trueなら「絶対パス・外部API等」に直接リクエスト
            debug = false,
            timeout = 10,
            extraHeaders = {},
            requestInit = {},
            onAuthError = "redirect",
        } = options

        const cacheKey = generateCacheKey(options)
        const now = Date.now()

        // キャッシュ有効時
        if (cacheTime && apiCache.has(cacheKey)) {
            const cached = apiCache.get(cacheKey)
            if (cached && now - cached.timestamp < cacheTime) {
                return cached.data as T
            }
        }

        // モックモード
        if (mockMode) {
            return await loadMockData<T>(endpoint)
        }

        // URL組み立て
        let url = ""
        if (overrideURI) {
            // 絶対パスや外部APIへのリクエスト
            url = endpoint
        } else {
            // APIプロキシ経由の相対パス
            url = endpoint.startsWith(apiProxy)
                ? endpoint
                : apiProxy.replace(/\/$/, "") +
                  (endpoint.startsWith("/") ? endpoint : `/${endpoint}`)
        }
        if (method === "GET" && params) {
            const qs = createQueryParams(params)
            if (qs) url += `?${qs}`
        }

        // リクエストヘッダ
        // CSRFトークンの最新値を取得
        const currentCSRFToken = csrfStore.token ?? ""
        // extraHeadersを全て小文字キーに正規化（念のため）
        const normalizedExtraHeaders = Object.fromEntries(
            Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v]),
        )
        const headers: Record<string, string> = {}
        // content-typeの自動付与ロジック
        const isFormData =
            typeof FormData !== "undefined" && data instanceof FormData
        if (!isFormData && !("content-type" in normalizedExtraHeaders)) {
            headers["content-type"] = "application/json"
        }
        // CSRFトークンを自動付与
        if (!("x-csrf-token" in normalizedExtraHeaders)) {
            headers["x-csrf-token"] = currentCSRFToken
        }
        // extraHeadersで上書き（明示的なcontent-typeや他ヘッダも反映）
        Object.assign(headers, normalizedExtraHeaders)
        // requestInit.headers をマージ（大文字小文字は問わないが一応小文字統一）
        const initHeadersRaw = requestInit.headers
        const initHeaders: Record<string, string> = {}
        if (initHeadersRaw) {
            // Headers | Record | Array いずれにも対応
            const h = new Headers(initHeadersRaw as HeadersInit)
            h.forEach((v, k) => {
                initHeaders[k.toLowerCase()] = v
            })
        }
        const mergedObj = { ...headers, ...initHeaders }
        const finalHeaders = new Headers()
        for (const [k, v] of Object.entries(mergedObj)) {
            // != null で nullと undefined を除外
            if (v != null) finalHeaders.set(k, String(v))
        }
        if (isFormData) {
            // FormDataの場合はcontent-typeを削除
            finalHeaders.delete("content-type")
        }
        // 最終ヘッダー（自動付与 → extraHeaders → requestInit.headers の順）
        const requestOptions: RequestInit = {
            method,
            ...requestInit,
            headers: finalHeaders,
        }

        // 419 リカバリを一度だけ
        let didCsrfRefresh = false
        //console.log('API Request:', { url, requestOptions, endpoint, overrideURI, currentCSRFToken })

        // リトライロジック
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // 再試行のたびに body を再セット
                if (["POST", "PUT", "PATCH"].includes(method)) {
                    requestOptions.body = isFormData
                        ? (data as FormData)
                        : data
                          ? JSON.stringify(data)
                          : undefined
                }

                const response = await fetchWithTimeout(
                    url,
                    requestOptions,
                    timeout,
                )

                if (!response.ok) {
                    // エラーハンドラに委譲
                    await handleErrorResponse(response, onAuthError)
                }

                // 204 No Content は nullを返す
                if (response.status === 204) {
                    return null
                }

                const contentType = response.headers.get("content-type")
                if (!contentType || !contentType.includes("application/json")) {
                    // JSON以外はテキストで返す
                    return (await response.text()) as T
                }

                const responseJson = await response.json()
                if (debug) downloadJsonFile(responseJson, response.url)
                if (cacheTime) {
                    apiCache.set(cacheKey, {
                        timestamp: now,
                        data: responseJson,
                    })
                }
                //console.log(`API Request [${attempt + 1}/${retries + 1}]:`, { url, requestOptions, responseJson })
                return responseJson
            } catch (error: unknown) {
                const status =
                    error instanceof ApiError ? error.status : undefined

                // 419 レスポンスは CSRF リフレッシュ→ヘッダ差し替え→即再試行
                if (status === 419 && !didCsrfRefresh) {
                    const refreshed = await csrfStore.refresh() // POST /auth/csrf/refresh
                    if (refreshed) {
                        finalHeaders.set("x-csrf-token", csrfStore.token ?? "")
                        didCsrfRefresh = true
                        continue // 同じ attempt で再試行（retries を消費しない）
                    }
                    if (onAuthError === "redirect") {
                        // CSRFリフレッシュ失敗時は認証エラーとして処理
                        navigateTo(ERROR_URL.SessionExpired, { replace: true })
                    }
                    // 上位の finally 用にエラーも投げる
                    throw new Error("Session expired. please login again.")
                }

                if (error instanceof Error && error.name === "AbortError") {
                    // タイムアウト
                    throw new Error("API Request timed out")
                }
                // リトライ判定
                if (attempt < retries && shouldRetry(error)) {
                    const delay = 2 ** attempt * 100
                    await new Promise((resolve) => setTimeout(resolve, delay))
                    continue
                }
                throw error // コンポーネント側でcatchできる
            }
        }
        return null
    }

    // 5xx/429エラー時のみリトライ
    function shouldRetry(error: unknown): boolean {
        const status = error instanceof ApiError ? error.status : undefined
        return (
            status !== undefined && [429, 500, 502, 503, 504].includes(status)
        )
    }

    // 共通エラー処理（認証・認可・バリデーション等）
    async function handleErrorResponse(
        response: Response,
        onAuthError: "redirect" | "throw",
    ): Promise<never> {
        let errorJson: unknown = null
        try {
            errorJson = await response.json()
        } catch (_e) {
            /* ignore */
        }

        const msg =
            (errorJson as { message?: string } | null)?.message ??
            `API Error: ${response.status} - ${response.statusText}`

        // エラーコードごとの遷移/通知
        if (response.status === 419) {
            throw new ApiError(msg || "CSRF token expired", 419, errorJson)
        }

        if (response.status === 401) {
            if (onAuthError === "redirect") {
                navigateTo(ERROR_URL.Unauthorized, { replace: true })
            }
            // 遷移したとしても上位が finally 等を通るため例外は投げる
            throw new ApiError(msg, response.status, errorJson)
        }
        if (response.status === 403) {
            throw new ApiError(msg || "Forbidden", 403, errorJson)
        }
        if (response.status === 422) {
            throw new ApiError(
                msg || "Validation error occurred",
                422,
                errorJson,
            )
        }
        if (response.status >= 500) {
            throw new ApiError(
                "Internal server error occurred. Please try again later.",
                response.status,
                errorJson,
            )
        }
        throw new ApiError(msg, response.status, errorJson)
    }

    // デバッグ用レスポンスJSONダウンロード
    function downloadJsonFile(
        // biome-ignore lint:/suspicious/noExplicitAny
        jsonData: any,
        requestURL: string,
    ): void {
        const jsonString = JSON.stringify(jsonData, null, 2)
        const blob = new Blob([jsonString], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const sanitizeFileName = (name: string) =>
            name.replace(/[/?<>\\:*|"]/g, "~")
        const urlObj = new URL(requestURL)
        const path = urlObj.pathname.replace(/\//g, "_")
        const queryParams = urlObj.searchParams
        let query = ""
        if (queryParams.toString()) {
            query = [...queryParams.entries()]
                .map(([key, value]) => `${key}-${sanitizeFileName(value)}`)
                .join("+")
        }
        const fileName = query ? `${path}_${query}.json` : `${path}.json`
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    // モックデータ取得
    async function loadMockData<T = unknown>(
        endpoint: string,
    ): Promise<T | null> {
        // mockMode時は/api以下のパスも有効にする
        const sanitized = endpoint
            .replace(apiProxy, "")
            .replace(/^\//, "")
            .replace(/\//g, "_")
        const mockFilePath = `/mocks/${sanitized}.json`
        try {
            const response = await fetch(mockFilePath)
            if (!response.ok) return null
            return await response.json()
        } catch {
            return null
        }
    }

    return {
        callApi,
    }
}
