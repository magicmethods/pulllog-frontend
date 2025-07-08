import { defineEventHandler, readBody } from 'h3'
import { buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // パスワード再設定時はCSRFトークン不要
    const headers = buildProxyHeaders(event, apiKey, [], false)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: '予期せぬエラーが発生しました' }
    }
    // body取得
    const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/auth/password`,
        headers,
        'PUT',
        body
    )
})
