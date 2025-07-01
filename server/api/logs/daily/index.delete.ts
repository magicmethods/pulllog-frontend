import { defineEventHandler, readBody } from 'h3'
import { buildUrlWithQuery, buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // 動的パラメータ取得
    const appId = event.context.params?.appId
    const date = event.context.params?.date

    if (!appId || !date) {
        event.node.res.statusCode = 400
        return { error: 'appIdとdateが必要です' }
    }

    // バックエンド用URL組み立て
    const url = buildUrlWithQuery(`${apiBaseURL}/logs/daily/${appId}/${date}`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: 'パラメータに不備があります' }
    }

    // ボディ取得
    const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers, 'DELETE', body)
})
