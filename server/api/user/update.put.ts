import { defineEventHandler } from 'h3'
import { buildUrlWithQuery, buildProxyHeaders, proxyFetchAndReturn, getFileExtension } from '~/server/utils/apiProxyUtil'

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const apiBaseURL = config.apiBaseURL
    const apiKey = config.secretApiKey

    // バックエンド用URL組み立て
    const url = buildUrlWithQuery(`${apiBaseURL}/user/update`, event)
    const avatarUrl = buildUrlWithQuery(`${apiBaseURL}/user/avatar`, event)

    // ヘッダ組み立て
    const headers = buildProxyHeaders(event, apiKey)
    if (!headers) {
        event.node.res.statusCode = 403
        return { error: 'Invalid parameters.' }
    }
    if ('content-length' in headers) {
        // biome-ignore lint:/performance/noDelete
        delete headers['content-length']
    }

    // フォームデータをパースし、テキストとファイルバイナリを分離
    const formData = await readFormData(event)
    const email = formData.get('email')
    const avatarFile = formData.get('avatar')
    if (avatarFile) {
        // アバターファイルが存在する場合、先にアップロードを処理
        if (!(avatarFile instanceof File)) {
            event.node.res.statusCode = 400
            return { error: 'Invalid avatar file format.' }
        }
        const newFormData = new FormData()
        const blob = new Blob([avatarFile], { type: (avatarFile as File).type })
        const tempFileName = encodeURIComponent(`[${email}].${getFileExtension((avatarFile as File).name)}`)
        newFormData.append('avatar', blob, tempFileName)
        if ('content-type' in headers) {
            // biome-ignore lint:/performance/noDelete content-typeはfetchが自動で設定するため削除
            delete headers['content-type']
        }
        const response = await proxyFetchAndReturn(event, avatarUrl, headers, 'POST', newFormData)
        if (!response || response.state !== 'success' || !response.user) {
            event.node.res.statusCode = 500
            return { error: 'Failed to upload avatar.' }
        }
        formData.append('avatarUrl', response.user.avatarUrl)
        formData.delete('avatar') // アップロード後は元のファイルを削除
    }
    // フォームデータをオブジェクトに変換
    const formDataObject: Record<string, string> = {}
    formData.forEach((value, key) => {
        if (typeof value === 'string' || typeof value === 'number') {
            // テキストデータのみオブジェクトに追加
            formDataObject[key] = value as string
        }
    })
    headers['content-type'] = 'application/json' // JSON形式で送信
    console.log('APIProxy::user/update:', formDataObject)

    // fetch&レスポンス返却
    return await proxyFetchAndReturn(event, url, headers, 'PUT', formDataObject)
})
