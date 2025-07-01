import { defineEventHandler } from 'h3'
import { buildUrlWithQuery, buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // パスパラメータ
    const appId = event.context.params?.appId
    if (!appId) {
        event.node.res.statusCode = 400
        return { error: 'パラメータが不足しています' }
    }

    // クエリ付きURL生成
    const url = buildUrlWithQuery(`${apiBaseURL}/apps/${appId ?? ''}`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: 'パラメータに不備があります' }
    }

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers)
})
