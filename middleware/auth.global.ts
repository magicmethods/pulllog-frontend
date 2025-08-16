export default defineNuxtRouteMiddleware((to, from) => {
    const userStore = useUserStore()

    // 認証不要ページ
    const isPublicRoute = to.path === '/' || to.path.startsWith('/auth/') || to.path.startsWith('/error/') || to.path.startsWith('/test')
    if (isPublicRoute) return

    // 認証が必要なルート
    const allowedPrefixes = ['/apps', '/history', '/stats', '/settings', '/dashboard']
    const isAllowedRoute = allowedPrefixes.some(prefix => to.path === prefix || to.path.startsWith(`${prefix}/`))
    if (isAllowedRoute) {
        //console.debug('auth.global.ts::', to.path, userStore.isLoggedIn, /^\/dashboard\/?$/.test(to.path))
        if (!userStore.isLoggedIn) {
            // 未認証ならログインページへ
            return navigateTo('/auth/login', { replace: true })
        }
        if (/^\/dashboard\/?$/.test(to.path)) {
            // ダッシュボードはユーザーのホームページにリダイレクト
            return navigateTo(userStore.user?.homePage ?? '/apps')
        }
        // 認証済みなら許可
        return
    }

    // 未定義ルート → トップページへ（404系はNuxtのエラーページへ）
    return navigateTo('/', { replace: true })
})
