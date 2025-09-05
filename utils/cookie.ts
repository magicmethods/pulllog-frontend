/**
 * Cookieを取得するためのユーティリティ関数
 * @param {string} name - 取得するCookieの名前
 * @returns {string | null} Cookieの値、またはnull
 */
export function getCookie(name: string): string | null {
    const cookies = document.cookie.split(";")
    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split("=")
        if (key === name) {
            return decodeURIComponent(value)
        }
    }
    return null
}

/**
 * Cookieを設定するためのユーティリティ関数
 * @param {string} name - 設定するCookieの名前
 * @param {string} value - 設定するCookieの値
 * @param {number} [days] - Cookieの有効期限（日数）
 * @param {string} [path] - Cookieのパス（デフォルトは'/'）
 */
export function setCookie(
    name: string,
    value: string,
    days?: number,
    path = "/",
) {
    let expires = ""
    if (days) {
        const date = new Date()
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
        expires = `; expires=${date.toUTCString()}`
    }
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=${path}`
}

/**
 * Cookieを削除するためのユーティリティ関数
 * @param {string} name - 削除するCookieの名前
 * @param {string} [path] - Cookieのパス（デフォルトは'/'）
 */
export function deleteCookie(name: string, path = "/") {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`
}
