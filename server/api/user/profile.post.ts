import { defineEventHandler, readBody } from "h3"
import { proxyFetchAndReturn } from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const _apiKey = config.secretApiKey

    // /user/profile ルートでのアカウント新規作成はあり得ないため封鎖
    const headers = null // buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: "An unexpected error occurred." }
    }
    // body取得
    const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/user/profile`,
        headers,
        "POST",
        body,
    )
})
