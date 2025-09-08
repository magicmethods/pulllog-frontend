import { defineEventHandler } from "h3"
import {
    buildProxyHeaders,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey
    const email = config.demoEmail
    const password = config.demoPassword

    if (!apiBaseURL || !apiKey || !email || !password) {
        event.node.res.statusCode = 500
        return { error: "Demo login is not configured." }
    }

    // ログイン時はCSRFトークン不要
    const headers = buildProxyHeaders(event, apiKey, [], false)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: "An unexpected error has occurred." }
    }
    headers["content-type"] = "application/json"
    delete headers["content-length"]

    // ログインpayload（必要に応じてRemember等を付与）
    const payload = { email, password, remember: false }

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/auth/login`,
        headers,
        "POST",
        payload,
    )
})
