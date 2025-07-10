import { type H3Event, getQuery, readRawBody } from 'h3'
import path from 'node:path'

/**
 * クエリパラメータを組み立ててURLに付与
 * @param baseUrl - ベースURL
 * @param event - H3Eventオブジェクト
 * @return 組み立てられたURL
 */
export function buildUrlWithQuery(baseUrl: string, event: H3Event): string {
    const query: QueryObject = getQuery(event)
    const queryString = new URLSearchParams(query).toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
}

/**
 * クライアントヘッダのうち、許可したものだけ抽出してマージ
 * - APIキーは必ず上書き
 * @param event - H3Eventオブジェクト
 * @param apiKey - APIキー
 * @param extendedHeaders - 追加で許可するヘッダ（オプション）
 * @param mustCsrfToken - CSRFトークンが必須かどうか（デフォルトはtrue）
 * @return マージされたヘッダオブジェクト、CSRFトークン不備時はnull
 */
export function buildProxyHeaders(
    event: H3Event,
    apiKey: string,
    extendedHeaders: string[] = [],
    mustCsrfToken = true
): Record<string, string> | null {
    const clientHeaders = event.node.req.headers
    let allowedHeaders = ['origin', 'x-csrf-token', 'authorization', 'content-type', 'content-length', 'accept', 'cookie', 'credentials', 'user-agent']
    // 追加のヘッダが指定されていればマージ
    if (extendedHeaders.length > 0) {
        allowedHeaders = [...allowedHeaders, ...extendedHeaders]
    }
    const proxyHeaders: Record<string, string> = {}

    for (const header of allowedHeaders) {
        const value = clientHeaders[header]
        if (typeof value === 'string') proxyHeaders[header] = value
    }
    proxyHeaders['x-api-key'] = apiKey // APIキーは必ず上書き

    // CSRFトークンが必須の場合はチェック
    if (mustCsrfToken) {
        if (!proxyHeaders['x-csrf-token'] || proxyHeaders['x-csrf-token'] === '') {
            return null
        }
        // proxyHeaders.credentials = 'include' // CSRFトークンをCookieで送信するために必要
    }


    return proxyHeaders
}

/**
 * APIリクエスト&レスポンス処理
 * - クライアントからのリクエストをバックエンドAPIにリレーし、レスポンスをそのまま返す
 * @param event - H3Eventオブジェクト
 * @param url - リクエスト先のURL
 * @param headers - リクエストヘッダ
 * @param method - HTTPメソッド（デフォルトはGET）
 * @param body - リクエストボディ（POST/PUT/PATCH/DELETE用）
 * @return レスポンスのボディ
 */
export async function proxyFetchAndReturn(
    event: H3Event,
    url: string,
    headers: Record<string, string>,
    method = 'GET',
    body?: unknown
) {
    // biome-ignore lint:/suspicious/noExplicitAny
    let fetchBody: any = undefined
    if (body !== undefined) {
        // FormData, Blob, ArrayBuffer, ReadableStream等はそのまま渡す
        if (
            typeof FormData !== 'undefined' && body instanceof FormData ||
            typeof Blob !== 'undefined' && body instanceof Blob ||
            typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer
        ) {
            console.log('APIProxy::fetchBody is FormData/Blob/ArrayBuffer:')
            fetchBody = body
        } else if (
            typeof body === 'string' ||
            body instanceof Uint8Array
        ) {
            fetchBody = body
        } else {
            // 通常のobject（JSON送信）
            fetchBody = JSON.stringify(body)
        }
    } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
        // body未指定の場合、リクエストボディを生で吸い出してfetchに流す
        // @description ファイル等のバイナリが含まれると挙動が怪しいので原則利用不可
        fetchBody = await readRawBody(event) // Buffer
    }

    const response = await fetch(url, {
        method,
        headers,
        body: fetchBody,
    })

    console.log('APIProxy::fetching:', method, url, headers, fetchBody?.length)

    event.node.res.statusCode = response.status
    if (response.status === 204) return null
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
        return await response.json()
    }
    return await response.text()
}

/**
 * ファイル名から拡張子を取得するユーティリティ関数
 * @param filename - ファイル名またはパス
 * @returns 拡張子（ドットを含まない）
 */
export function getFileExtension(filename: string): string {
    return path.extname(filename).slice(1)
}

