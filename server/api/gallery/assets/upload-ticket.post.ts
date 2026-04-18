import { defineEventHandler, readBody } from "h3"
import {
    buildProxyHeaders,
    proxyFetchAndReturn,
} from "~/server/utils/apiProxyUtil"

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: "Invalid parameters." }
    }

    const body = await readBody(event)
    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/gallery/assets/upload-ticket`,
        headers,
        "POST",
        body,
    )
})
