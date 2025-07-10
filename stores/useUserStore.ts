import { useAppStore } from './useAppStore'
import { useCsrfStore } from './useCsrfStore'
import { useLogStore } from './useLogStore'
import { useStatsStore } from './useStatsStore'
import { useGlobalStore } from './globalStore'
import { endpoints } from '~/api/endpoints'
import { toUser } from '~/utils/user'

export const useUserStore = defineStore('user', () => {
    // state
    const user = ref<User | null>(null)
    const planLimits = ref<UserPlanLimits | null>(null)
    const isLoggedIn = computed(() => user.value !== null)

    // Composables
    const { callApi } = useAPI()

    // actions
    function setUser(u: User, limits?: UserPlanLimits | null) {
        user.value = u
        planLimits.value = limits ?? null
    }
    // デバッグ用
    function setDummyUser(
        partialUserData?: Partial<User>,
        planLimitsData?: Partial<UserPlanLimits>
    ): void {
        const nowDateStr = new Date().toISOString()
        const baseDummyUser: Partial<User> = {
            id: 1,
            name: 'Ling Xiaoyu',
            email: 'ling-xiaoyu@dev.pulllog.net',
            avatarUrl: 'sample/ling-xiaoyu.png',
            roles: ['user'],
            //plan: 'standard',
            plan: 'free',
            planExpiration: '2025-12-31',
            language: localStorage.getItem('language') || 'ja',
            theme: localStorage.getItem('theme') || 'light',
            homePage: '/apps',
            createdAt: nowDateStr,
            updatedAt: nowDateStr,
            lastLogin: nowDateStr,
        }
        const baseDummyLimits: Partial<UserPlanLimits> = {
            maxApps: 5,
            maxAppNameLength: 30,
            maxAppDescriptionLength: 400,
            maxLogTags: 5,
            maxLogTagLength: 30,
            maxLogTextLength: 250,
            maxLogsPerApp: 100,
            maxLogSize: 1024 * 1024,
            maxStorage: 1024 * 1024 * 1024,
        }
        const dummyUser = { ...baseDummyUser, ...partialUserData } as User
        const dummyLimits = { ...baseDummyLimits, ...planLimitsData } as UserPlanLimits
        setUser(dummyUser, dummyLimits)
    }
    function clearUser() {
        user.value = null
    }

    // Methods
    /**
     * ユーザー情報をAPI経由で更新し、ストアも反映
     * - ファイル・テキスト混在可
     * @param {Partial<User> | FormData} data - 更新するユーザー情報（部分的でもOK）
     * @returns {Promise<void>}
     * @throws {Error} - ユーザー情報の更新に失敗した場合
     */
    async function updateUser(data: Partial<User> | FormData): Promise<void> {
        if (!user.value) throw new Error('ログインユーザーが不明です')
        
        try {
            let contentType: string | undefined
            // FormDataの場合はContent-Typeを設定しない
            if (data instanceof FormData) {
                contentType = undefined
            } else {
                contentType = 'application/json'
            }

            // APIリクエスト
            const res: UserUpdateResponse = await callApi({
                endpoint: endpoints.user.update(),
                method: 'PUT',
                data,
                // FormDataの時はcontent-typeをセットしない（fetchが自動で境界を付与）
                extraHeaders: contentType ? { 'content-type': contentType } : {},
            })

            if (!res || res.state !== 'success' || !res.user) {
                throw new Error(res?.message || 'ユーザー情報の更新に失敗しました')
            }

            // レスポンスをUser型に変換してストアに反映
            user.value = { ...user.value, ...toUser(res.user) }
        } catch (err: unknown) {
            console.error('Failed to update user:', err)
            throw new Error(err instanceof Error ? err.message : 'ユーザー情報の更新中にエラーが発生しました')
        }
    }
    /**
     * ログアウト処理
     * - バックエンドAPIを呼び出してサーバー側セッションを消去
     * - ユーザーデータをクリア
     * - CSRFトークンをクリア
     * - アプリデータをクリア
     * - ログデータのキャッシュをクリア
     * - 統計データのキャッシュをクリア
     */
    async function logout() {
        const global = useGlobalStore()
        global.setLoading(true)
        try {
            // バックエンドAPIコールでサーバー側セッション消去
            try {
                await callApi({
                    endpoint: endpoints.auth.logout(),
                    method: 'POST',
                })
            } catch (apiErr: unknown) {
                // サーバーセッション削除失敗時も、フロント側は続行
                console.warn('バックエンドセッション削除に失敗:', apiErr)
            }
            // フロント側状態のクリア
            clearUser()
            useCsrfStore().clearToken()
            const appStore = useAppStore()
            appStore.clearApp()
            appStore.clearAppList()
            useLogStore().clearLogs()
            useStatsStore().clearStatsCacheAll()
        } finally {
            global.setLoading(false)
        }
    }
    /** ログインは useAuth.ts コンポーザブルで実装 */

    return {
        user,
        planLimits,
        isLoggedIn,
        setUser,
        setDummyUser,
        clearUser,
        updateUser,
        logout,
    }
})
