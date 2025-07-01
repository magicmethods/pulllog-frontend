export const API_PROXY_ALLOW_LIST = [
    // /api/apps, /api/user/profile など正規表現やパスで指定
    /^apps(?:\/|$)/,
    /^logs(?:\/|$)/,
    /^stats(?:\/|$)/,
    /^user(?:\/|$)/,
    /^auth(?:\/|$)/,
    // 必要に応じて追加
]
export function isAllowedApiPath(path: string): boolean {
    return API_PROXY_ALLOW_LIST.some(re => re.test(path))
}
