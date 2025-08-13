import { defineEventHandler, readBody } from 'h3'
import { buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // /auth 配下は CSRF 不要
    const headers = buildProxyHeaders(event, apiKey, [], false)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: 'An unexpected error has occurred.' }
    }

    const body = await readBody(event)

    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/auth/google/exchange`,
        headers,
        'POST',
        body
    )
})
