/**
 * API通信系型
 */
declare global {
    type AllowMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    type RequestParams = Record<string, string | number | boolean | Array<string | number | boolean>>
    // biome-ignore lint:/suspicious/noExplicitAny
    type RequestData = Record<string, any>
    /** API呼び出しオプション (composables/useAPI.ts) */
    type CallApiOptions = {
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
        onAuthError?: 'redirect' | 'throw' // 認証エラー時の動作
    }
    /** 削除レスポンス（汎用） */
    type DeleteResponse = {
        state: 'success' | 'error'
        message?: string
    } | null
    /** 認証レスポンス（汎用） */
    type VerifyType = 'signup' | 'reset'
    type VerifyResponse = {
        success: boolean
        message?: string
    }

}
export {}
