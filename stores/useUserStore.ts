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
    const isLoggedIn = computed(() => user.value !== null)

    // Composables
    const { callApi } = useAPI()

    // actions
    function setUser(u: User) {
        user.value = u
    }
    // デバッグ用
    function setDummyUser(partialUserData?: Partial<User>) {
        const nowDateStr = new Date().toISOString()
        const baseDummyUser = {
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
        const dummyUser = { ...baseDummyUser, ...partialUserData } as User
        setUser(dummyUser)
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
        isLoggedIn,
        setUser,
        setDummyUser,
        clearUser,
        updateUser,
        logout,
    }
})
