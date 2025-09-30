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

    const context = event.context.params?.context
    if (!context) {
        event.node.res.statusCode = 400
        return { error: "Missing parameters." }
    }

    const endpoint = [apiBaseURL, "user-filters", context].join("/")
    const url = buildUrlWithQuery(endpoint, event)

    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    return await proxyFetchAndReturn(event, url, headers)
})
