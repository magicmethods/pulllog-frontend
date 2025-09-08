import { defineEventHandler, readBody } from "h3"
import {
    buildProxyHeaders,
    buildUrlWithQuery,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // バックエンド用URL組み立て
    const url = buildUrlWithQuery(`${apiBaseURL}/auth/csrf/refresh`, event)

    // /auth 配下は CSRF 不要
    const headers = buildProxyHeaders(event, apiKey, [], false)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    // 送信データを作成
    const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers, "POST", body)
})
