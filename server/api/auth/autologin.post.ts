import { defineEventHandler } from "h3"
import {
    buildProxyHeaders,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // ログイン時はCSRFトークン不要
    const headers = buildProxyHeaders(event, apiKey, [], false)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: "An unexpected error has occurred." }
    }
    // body取得
    //const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/auth/autologin`,
        headers,
        "POST",
    )
})
