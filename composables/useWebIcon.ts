const ICON_CACHE_KEY = "pulllog:icon-cache"
const fallbackIcon = "/images/pulllog-icon.svg"

// キャッシュ先ストレージ
const cacheStorage = import.meta.client ? sessionStorage : null

// キャッシュ（in-memory）
const iconCache = new Map<string, string>()

/**
 * WEBストレージに保存されているキャッシュを読み込む
 */
function loadCacheFromStorage() {
    try {
        const raw = cacheStorage?.getItem(ICON_CACHE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as Record<string, string>
        for (const [domain, iconUrl] of Object.entries(parsed)) {
            iconCache.set(domain, iconUrl)
        }
    } catch (e) {
        console.warn("Icon cache load failed:", e)
    }
}

/**
 * iconCache をWEBストレージに保存する
 */
function saveCacheToStorage() {
    try {
        const json = JSON.stringify(Object.fromEntries(iconCache.entries()))
        cacheStorage?.setItem(ICON_CACHE_KEY, json)
    } catch (e) {
        console.warn("Icon cache save failed:", e)
    }
}

export function useWebIcon() {
    if (import.meta.client && iconCache.size === 0) {
        loadCacheFromStorage()
    }

    /**
     * Favicon API を使ってアイコンURLを取得（キャッシュ付き）
     */
    const fetchWebIcon = (url: string): string => {
        if (!url || import.meta.server) return fallbackIcon

        try {
            const domain = new URL(url).hostname.replace(/^www\./, "")

            // キャッシュチェック
            if (iconCache.has(domain)) {
                return iconCache.get(domain) as string
            }

            // Google Favicon API を組み立て
            const iconUrl = new URL("https://www.google.com/s2/favicons")
            iconUrl.searchParams.set("domain", domain)
            iconUrl.searchParams.set("sz", "64")
            iconUrl.searchParams.set("alt", "png")

            const finalUrl = iconUrl.href
            iconCache.set(domain, finalUrl)
            saveCacheToStorage()

            return finalUrl
        } catch (e) {
            console.error("Invalid URL in fetchWebIcon:", url, e)
            return fallbackIcon
        }
    }

    return {
        fetchWebIcon,
    }
}
