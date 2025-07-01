import { defineEventHandler, readBody } from 'h3'
import { buildProxyHeaders, proxyFetchAndReturn } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // /user/profile ルートでのアカウント新規作成はあり得ないため封鎖
    const headers = null // buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 500
        return { error: '予期せぬエラーが発生しました' }
    }
    // body取得
    const body = await readBody(event)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(
        event,
        `${apiBaseURL}/user/profile`,
        headers,
        'POST',
        body
    )
})
