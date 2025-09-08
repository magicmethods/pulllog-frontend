import { defineEventHandler, getQuery, readBody } from "h3"
import {
    buildProxyHeaders,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"
import { isAllowedApiPath } from "~/server/utils/apiProxyWhitelist"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // パスパラメータ抽出
    const path = event.context.params?.path
    if (!path || !isAllowedApiPath(path)) {
        event.node.res.statusCode = 404
        return { error: "API route not allowed" }
    }
    // クエリ抽出
    const query: QueryObject = getQuery(event)
    // メソッド
    const method = event.node.req.method ?? "GET"
    // リクエストボディ
    let body: unknown = null
    if (["POST", "PUT", "PATCH"].includes(method)) {
        body = await readBody(event)
    }

    // バックエンドAPIのリクエストURL組み立て
    const queryString = new URLSearchParams(query).toString()
    const backendURL = `${apiBaseURL}/${path}${queryString ? `?${queryString}` : ""}`

    // ヘッダマージ
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    // 汎用APIプロキシを通過する野良リクエストはログに記録する
    /* 暫定 - 開発時のみ有効化
    console.log(
        "APIProxy::Fetching stray request:",
        method,
        backendURL,
        headers,
        body,
    )
    */

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, backendURL, headers, method, body)
})
