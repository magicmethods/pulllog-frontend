import { defineEventHandler } from "h3"
import {
    buildProxyHeaders,
    buildUrlWithQuery,
    getFileExtension,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // 動的パラメータ取得
    const appId = event.context.params?.appId

    if (!appId) {
        event.node.res.statusCode = 400
        return { error: "Missing parameters." }
    }

    // バックエンド用URL組み立て
    const url = buildUrlWithQuery(`${apiBaseURL}/logs/import/${appId}`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }
    if ("content-length" in headers) {
        // biome-ignore lint:/performance/noDelete
        delete headers["content-length"]
    }

    // ボディは取得しない（ファイルストリームのまま送信するため）
    //const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers, "POST")
})
