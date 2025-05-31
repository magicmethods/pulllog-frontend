export default defineNuxtRouteMiddleware((to, from) => {
    const appConfig = useAppConfig()
    const userStore = useUserStore() // 認証ストア

    // ランディングまたは認証系は制限しない
    if (
        to.path === '/' ||
        to.path.startsWith('/auth/')
    ) {
        return
    }

    // デバッグ時に認証をスキップする
    if (appConfig.isDebug) {
        // デバッグユーザーをセット
        userStore.setDummyUser()
        const allowedPrefixes = ['/history', '/apps', '/stats', '/settings']
        if (!allowedPrefixes.some(prefix => to.path === prefix || to.path.startsWith(`${prefix}/`))) {
            return navigateTo('/history')
        }
        return
    }

    if (!userStore.isAuthenticated) {
        return navigateTo('/auth/login')
    }
})
