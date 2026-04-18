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
    const assetId = event.context.params?.assetId

    if (!assetId) {
        event.node.res.statusCode = 400
        return { error: "Missing parameters." }
    }

    const url = buildUrlWithQuery(
        `${apiBaseURL}/gallery/assets/${assetId}`,
        event,
    )
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    const body = await readBody(event)
    return await proxyFetchAndReturn(event, url, headers, "DELETE", body)
})
