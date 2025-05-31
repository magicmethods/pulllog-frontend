import { useCsrfStore } from '~/stores/useCsrfStore'
import { ERROR_URL } from '~/utils/error'

/* Types (Moved to `types/global.d.ts`)
export type AllowMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type RequestParams = Record<string, string | number | boolean | (string | number | boolean)[]>
// biome-ignore lint:/suspicious/noExplicitAny
export type RequestData = Record<string, any>
// API呼び出しオプション型
export type CallApiOptions = {
    endpoint: string
    method: AllowMethod
    params?: RequestParams
    data?: RequestData
    retries?: number // デフォルト0
    cacheTime?: number // ms, デフォルト0
    overrideURI?: boolean
    debug?: boolean
    timeout?: number // 秒単位, デフォルト10
    extraHeaders?: Record<string, string>
    requestInit?: RequestInit
}
*/

const OK_RESPONSE_CODES = new Set([
    200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
])

const apiCache = new Map<string, { timestamp: number; data: unknown }>()

export function useAPI() {
    const appConfig = useAppConfig()
    const baseURL = appConfig.apiBaseUrl as string ?? ''
    const apiKey = appConfig.apiKey as string ?? ''
    const mockMode = appConfig.mockMode as boolean ?? false
    const csrfStore = useCsrfStore()
    const csrfToken = csrfStore.token ?? ''

    // ユーティリティ
    function createQueryParams(params: RequestParams): string {
        const searchParams = new URLSearchParams()
        for (const key in params) {
            const value = params[key]
            if (Array.isArray(value)) {
                for (const v of value) searchParams.append(key, String(v))
            } else {
                searchParams.append(key, String(value))
            }
        }
        return searchParams.toString()
    }

    // キャッシュキー生成
    function generateCacheKey(options: CallApiOptions): string {
        const { endpoint, method, params } = options
        return `${method}:${endpoint}:${params ? JSON.stringify(params) : ''}`
    }

    // タイムアウト付きfetch
    async function fetchWithTimeout(url: string, options: RequestInit, timeoutSec: number): Promise<Response> {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000)
        try {
            const response = await fetch(url, { ...options, signal: controller.signal })
            return response
        } catch (error) {
            clearTimeout(timeoutId)
            throw error
        } finally {
            clearTimeout(timeoutId)
        }
    }

    // メインAPI呼び出し
    async function callApi<T = unknown>(options: CallApiOptions): Promise<T | null> {
        const {
            endpoint,
            method,
            params,
            data,
            retries = 0,
            cacheTime = 0,
            overrideURI = false,
            debug = false,
            timeout = 10,
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

        let url = overrideURI ? endpoint : baseURL + endpoint
        if (method === 'GET' && params) {
            url += `?${createQueryParams(params)}`
        }

        // リクエストヘッダ
        const baseHeaders = {
            'Content-Type': 'application/json',
            'X-API-KEY': apiKey, // APIキー自動付与
            'X-CSRF-Token': csrfToken, // CSRFトークン自動付与
        }
        const mergedHeaders = {
            ...baseHeaders,
            ...(options.extraHeaders ?? {}),
        }
        const requestOptions: RequestInit = {
            method,
            headers: mergedHeaders,
            ...(options.requestInit ?? {}),
        }
        if (['POST', 'PUT', 'PATCH'].includes(method) && data) {
            requestOptions.body = JSON.stringify(data)
        }

        console.log('APIリクエスト:', { url, requestOptions })

        // リトライロジック
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetchWithTimeout(url, requestOptions, timeout)

                if (!response.ok) {
                    // エラーハンドラに委譲
                    await handleErrorResponse(response)
                }

                // 200系/204対応
                if (!OK_RESPONSE_CODES.has(response.status)) {
                    throw new Error(`API Error: ${response.status} - ${response.statusText}`)
                }
                if (response.status === 204) {
                    return null
                }
                const contentType = response.headers.get('content-type')
                if (!contentType || !contentType.includes('application/json')) {
                    // JSON以外はテキストで返す
                    // @ts-ignore
                    return (await response.text()) as T
                }

                const responseJson = await response.json()
                if (debug) downloadJsonFile(responseJson, response.url)
                if (cacheTime) {
                    apiCache.set(cacheKey, { timestamp: now, data: responseJson })
                }
                return responseJson
            } catch (
                // biome-ignore lint:/suspicious/noExplicitAny
                error: any
            ) {
                if (error.name === 'AbortError') {
                    // タイムアウト
                    throw new Error('APIリクエストがタイムアウトしました')
                }
                // リトライ判定
                if (attempt < retries && shouldRetry(error)) {
                    const delay = 2 ** attempt * 100
                    await new Promise(resolve => setTimeout(resolve, delay))
                    continue
                }
                throw error // 画面側でcatchされる
            }
        }
        return null
    }

    // 5xx/429エラー時のみリトライ
    function shouldRetry(error: unknown): boolean {
        if (error instanceof Response) {
            return [429, 500, 502, 503, 504].includes(error.status)
        }
        return false
    }

    // 共通エラー処理（認証・認可・バリデーション等）
    async function handleErrorResponse(response: Response): Promise<never> {
        let errorJson = null
        try {
            errorJson = await response.json()
        } catch (e) {
            // JSON以外は無視
        }

        // エラーコードごとの遷移/通知
        if (response.status === 401) {
            navigateTo(ERROR_URL.Unauthorized, { external: true })
        } else if (response.status === 403) {
            navigateTo(ERROR_URL.Forbidden, { external: true })
        } else if (response.status === 422) {
            // 画面側でバリデーションエラー表示
            throw new Error(errorJson?.detail ?? 'バリデーションエラーが発生しました')
        } else if (response.status >= 500) {
            throw new Error('サーバー内部エラーが発生しました。時間を置いて再試行してください')
        }
        throw new Error(errorJson?.detail ?? `API Error: ${response.status} - ${response.statusText}`)
    }

    // デバッグ用レスポンスJSONダウンロード
    function downloadJsonFile(
        // biome-ignore lint:/suspicious/noExplicitAny
        jsonData: any,
        requestURL: string
    ): void {
        const jsonString = JSON.stringify(jsonData, null, 2)
        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const sanitizeFileName = (name: string) =>
            name.replace(/[\/\?<>\\:\*\|"]/g, '~')
        const urlObj = new URL(requestURL)
        const path = urlObj.pathname.replace(/\//g, '_')
        const queryParams = urlObj.searchParams
        let query = ''
        if (queryParams.toString()) {
            query = [...queryParams.entries()].map(([key, value]) => `${key}-${sanitizeFileName(value)}`).join('+')
        }
        const fileName = query ? `${path}_${query}.json` : `${path}.json`
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    // モックデータ取得
    async function loadMockData<T = unknown>(endpoint: string): Promise<T | null> {
        const sanitized = endpoint.replace(baseURL as string, '').replace(/^\//, '').replace(/\//g, '_')
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
