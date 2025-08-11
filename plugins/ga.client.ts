declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void
        dataLayer?: unknown[]
    }
}

export default defineNuxtPlugin((nuxtApp) => {
    const { public: { gaId, isDebug } } = useRuntimeConfig()

    // ID未設定なら何もしない（開発・プレビューでの誤送信防止）
    if (!gaId) {
        if (import.meta.env.DEV) {
            console.warn('[GA] gaId is not set. Skipped.')
        }
        return
    }

    // gtag.js を挿入
    const s1 = document.createElement('script')
    s1.async = true
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`
    document.head.appendChild(s1)

    const s2 = document.createElement('script')
    s2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){ dataLayer.push(arguments); }
        window.gtag = gtag;

        gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied'
        });

        gtag('js', new Date());
        gtag('config', '${gaId}', {
            send_page_view: false${isDebug ? ", debug_mode: true" : ""}
        });
    `
    document.head.appendChild(s2)

    // 初回 & 以降のページ遷移で page_view を送信
    const sendPageView = () => {
        const gtag = window.gtag
        if (!gtag) return
        gtag('event', 'page_view', {
            page_path: window.location.pathname + window.location.search,
            page_title: document.title,
        })
    }

    // 初回
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        sendPageView()
    } else {
        window.addEventListener('DOMContentLoaded', sendPageView, { once: true })
    }

    // ルート遷移ごと（Nuxt 3）
    // - page:finish はクライアント側でページ描画完了後に呼ばれる
    nuxtApp.hook('page:finish', () => {
        sendPageView()
    })
})
