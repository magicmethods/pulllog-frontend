import { defineEventHandler } from "h3"
import {
    buildProxyHeaders,
    buildUrlWithQuery,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    const url = buildUrlWithQuery(`${apiBaseURL}/gallery/assets`, event)
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    return await proxyFetchAndReturn(event, url, headers)
})
