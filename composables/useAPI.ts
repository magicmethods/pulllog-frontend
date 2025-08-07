import { useCsrfStore } from '~/stores/useCsrfStore'
import { ERROR_URL } from '~/utils/error'

const OK_RESPONSE_CODES = new Set([
    200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
])

const apiCache = new Map<string, { timestamp: number; data: unknown }>()

export function useAPI() {
    const appConfig = useConfig()
    const apiProxy = appConfig.apiProxy ?? '/api'
    const apiBaseURL = appConfig.apiBaseURL ?? ''
    const mockMode = appConfig.mockMode ?? false
    const csrfStore = useCsrfStore()

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
            overrideURI = false, // trueなら「絶対パス・外部API等」に直接リクエスト
            debug = false,
            timeout = 10,
            extraHeaders = {},
            requestInit = {},
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
        let url = ''
        if (overrideURI) {
            // 絶対パスや外部APIへのリクエスト
            url = endpoint
        } else {
            // APIプロキシ経由の相対パス
            url = endpoint.startsWith(apiProxy)
                ? endpoint
                : apiProxy.replace(/\/$/, '') + (endpoint.startsWith('/') ? endpoint : `/${endpoint}`)
        }
        if (method === 'GET' && params) {
            url += `?${createQueryParams(params)}`
        }

        // リクエストヘッダ
        // CSRFトークンの最新値を取得
        const currentCSRFToken = csrfStore.token ?? ''
        // extraHeadersを全て小文字キーに正規化（念のため）
        const normalizedExtraHeaders = Object.fromEntries(
            Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])
        )
        const headers: Record<string, string> = {}
        // content-typeの自動付与ロジック
        const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
        if (!isFormData && !('content-type' in normalizedExtraHeaders)) {
            headers['content-type'] = 'application/json'
        }
        // CSRFトークンを自動付与
        if (!('x-csrf-token' in normalizedExtraHeaders)) {
            headers['x-csrf-token'] = currentCSRFToken
        }
        // extraHeadersで上書き（明示的なcontent-typeや他ヘッダも反映）
        Object.assign(headers, normalizedExtraHeaders)
        const requestOptions: RequestInit = {
            method,
            headers,
            ...requestInit,
        }
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (isFormData) {
                // FormDataの場合はbodyにそのままセット
                requestOptions.body = data as FormData
                // FormDataのときはcontent-typeを明示的に削除（念のため）
                if (headers['content-type']) {
                    (requestOptions.headers as Record<string, string | undefined>)['content-type'] = undefined
                }
            } else if (data) {
                requestOptions.body = JSON.stringify(data)
            }
        }

        console.log('API Request:', { url, requestOptions, endpoint, overrideURI, currentCSRFToken })

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
            } catch (error: unknown) {
                if (error instanceof Error && error.name === 'AbortError') {
                    // タイムアウト
                    throw new Error('API Request timed out')
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
            //navigateTo(ERROR_URL.Forbidden, { external: true })
            throw new Error(`403 Error: ${errorJson?.message ?? 'Forbidden'}`)
        } else if (response.status === 422) {
            // 画面側でバリデーションエラー表示
            throw new Error(errorJson?.message ?? 'Validation error occurred')
        } else if (response.status >= 500) {
            throw new Error('Internal server error occurred. Please try again later.')
        }
        throw new Error(errorJson?.message ?? `API Error: ${response.status} - ${response.statusText}`)
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
        // mockMode時は/api以下のパスも有効にする
        const sanitized = endpoint.replace(apiProxy, '').replace(/^\//, '').replace(/\//g, '_')
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
