import { defineEventHandler } from 'h3'
import { buildUrlWithQuery, buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // クエリ付きURL生成
    const url = buildUrlWithQuery(`${apiBaseURL}/apps`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: 'Invalid parameters.' }
    }

    console.log('APIProxy::Fetching app list:', url, headers)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers)
})
