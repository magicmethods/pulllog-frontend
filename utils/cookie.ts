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

// Cookie Store API based async helpers (with graceful fallback)
type CookieSetOptions = {
    /** absolute expiry time. if omitted and days provided, it will be computed */
    expires?: Date | number | string
    /** relative expiry in days (convenience) */
    days?: number
    path?: string
    secure?: boolean
    sameSite?: "lax" | "strict" | "none"
}

type CookieStoreLike = {
    set: (input: unknown) => Promise<void>
    get: (name: string) => Promise<{ name: string; value: string } | undefined>
    delete: (input: unknown) => Promise<void>
}

export async function setCookieAsync(
    name: string,
    value: string,
    options: CookieSetOptions = {},
): Promise<void> {
    const path = options.path ?? "/"
    const sameSite = options.sameSite ?? "lax"
    const secure = options.secure ?? true
    let expires: number | Date | undefined
    if (options.expires instanceof Date) expires = options.expires
    else if (typeof options.expires === "number") expires = options.expires
    else if (typeof options.expires === "string")
        expires = new Date(options.expires)
    else if (typeof options.days === "number") {
        const d = new Date()
        d.setTime(d.getTime() + options.days * 24 * 60 * 60 * 1000)
        expires = d
    }
    // Feature detection
    const maybeGlobal = globalThis as unknown as {
        cookieStore?: CookieStoreLike
    }
    const maybeNav = navigator as unknown as { cookieStore?: CookieStoreLike }
    const cookieStore: CookieStoreLike | undefined =
        maybeGlobal.cookieStore || maybeNav.cookieStore
    if (cookieStore?.set) {
        await cookieStore.set({ name, value, path, sameSite, secure, expires })
        return
    }
    // Fallback
    const days =
        options.days ??
        (expires instanceof Date
            ? Math.ceil(
                  (expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
              )
            : undefined)
    setCookie(name, value, days, path)
}

export async function deleteCookieAsync(
    name: string,
    path = "/",
): Promise<void> {
    const maybeGlobal = globalThis as unknown as {
        cookieStore?: CookieStoreLike
    }
    const maybeNav = navigator as unknown as { cookieStore?: CookieStoreLike }
    const cookieStore: CookieStoreLike | undefined =
        maybeGlobal.cookieStore || maybeNav.cookieStore
    if (cookieStore?.delete) {
        await cookieStore.delete({ name, path })
        return
    }
    deleteCookie(name, path)
}

export async function getCookieAsync(name: string): Promise<string | null> {
    const maybeGlobal = globalThis as unknown as {
        cookieStore?: CookieStoreLike
    }
    const maybeNav = navigator as unknown as { cookieStore?: CookieStoreLike }
    const cookieStore: CookieStoreLike | undefined =
        maybeGlobal.cookieStore || maybeNav.cookieStore
    if (cookieStore?.get) {
        const c = await cookieStore.get(name)
        return c?.value ?? null
    }
    return getCookie(name)
}
