import { defineEventHandler, readBody } from 'h3'
import { buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // ログアウト時はCSRFトークンが必要
    const headers = buildProxyHeaders(event, apiKey, [], true)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: '予期せぬエラーが発生しました' }
    }
    // 通常ログアウトはbody不要ですが、API側仕様に合わせて取得
    const body = await readBody(event)

    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/auth/logout`,
        headers,
        'POST',
        body
    )
})
