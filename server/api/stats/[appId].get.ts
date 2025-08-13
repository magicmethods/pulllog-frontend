import { defineEventHandler } from 'h3'
import { buildUrlWithQuery, buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // パスパラメータ
    const appId = event.context.params?.appId
    // クエリ付きURL生成
    // エンドポイント: "{apiBaseURL}/stats/:appId"
    const url = buildUrlWithQuery(`${apiBaseURL}/stats/${appId ?? ''}`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: 'Invalid parameters.' }
    }

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers)
})
