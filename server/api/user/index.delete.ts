import { defineEventHandler, readBody } from "h3"
import {
    buildProxyHeaders,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // バックエンド用URL組み立て
    const url = buildUrlWithQuery(`${apiBaseURL}/user`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    // ボディ取得
    const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers, "DELETE", body)
})
