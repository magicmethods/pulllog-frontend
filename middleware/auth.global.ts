export default defineNuxtRouteMiddleware((to, from) => {
    const appConfig = useAppConfig()
    const userStore = useUserStore()

    // 認証不要ページ
    const isPublicRoute = to.path === '/' || to.path.startsWith('/auth/')
    if (isPublicRoute) return

    // デバッグ時に認証スキップ用にダミーユーザーをセット
    if (appConfig.isDebug && !userStore.isLoggedIn) {
        localStorage.removeItem('theme')
        localStorage.removeItem('language')
        userStore.setDummyUser({ id: 999, homePage: '/history' })
    }

    // 認証が必要なルート
    const allowedPrefixes = ['/apps', '/history', '/stats', '/settings', '/dashboard']
    const isAllowedRoute = allowedPrefixes.some(prefix => to.path === prefix || to.path.startsWith(`${prefix}/`))
    if (isAllowedRoute) {
        //console.debug('auth.global.ts::', to.path, userStore.isLoggedIn, /^\/dashboard\/?$/.test(to.path))
        if (!userStore.isLoggedIn) {
            // 未認証ならログインページへ
            return navigateTo('/auth/login')
        }
        if (/^\/dashboard\/?$/.test(to.path)) {
            // ダッシュボードはユーザーのホームページにリダイレクト
            return navigateTo(userStore.user?.homePage ?? '/apps')
        }
        // 認証済みなら許可
        return
    }

    // 未定義ルート → トップページへ（404系はNuxtのエラーページへ）
    return navigateTo('/')
})
