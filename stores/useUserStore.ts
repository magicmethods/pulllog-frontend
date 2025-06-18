import { useCsrfStore } from './useCsrfStore'
import { useGlobalStore } from './globalStore'

/** Types ( types/global.d.ts にて定義済みのため、ここでは参照のみ)
type User = {
    id?: number // 将来的に必要なら使用
    name: string // ユーザー名（表示名）
    email: string // メールアドレス（=ログインID）
    avatarUrl?: string | null // アバター画像URL（nullの場合はデフォルト画像を使用）
    roles?: string[] // ユーザーの役割
    plan?: string // ユーザープラン
    planExpiration?: string // プランの有効期限: YYYY-MM-DD形式の文字列
    language: string // ユーザーの言語設定（ja, enなど）
    theme: string // ユーザーのテーマ設定（light, darkなど）
    homePage?: string // ログイン後に表示されるページ（ルートパス）
    createdAt: string // ユーザー登録日時: YYYY-MM-DDTHH:mm:ss形式
    updatedAt: string // ユーザー情報更新日時: YYYY-MM-DDTHH:mm:ss形式
    lastLogin: string // 最終ログイン日時: YYYY-MM-DDTHH:mm:ss形式
}
*/

export const useUserStore = defineStore('user', () => {
    // state
    const user = ref<User | null>(null)
    const isLoggedIn = computed(() => user.value !== null)

    // actions
    function setUser(u: User) {
        user.value = u
    }
    // デバッグ用
    function setDummyUser(partialUserData?: Partial<User>) {
        const baseDummyUser = {
            id: 1,
            name: 'Ling Xiaoyu',
            email: 'ling-xiaoyu@dev.pulllog.net',
            avatarUrl: 'sample/ling-xiaoyu.png',
            //roles: ['user'],
            //plan: 'free',
            //planExpiration: '2025-06-30',
            language: 'ja',
            theme: 'light',
            homePage: '/history',
            createdAt: '2025-05-02T01:23:45',
            updatedAt: '2025-05-02T01:23:45',
            lastLogin: '2025-05-10T04:56:12',
        }
        const dummyUser = { ...baseDummyUser, ...partialUserData } as User
        setUser(dummyUser)
    }
    function clearUser() {
        user.value = null
    }

    // Methods
    async function logout() {
        const global = useGlobalStore()
        global.setLoading(true)
        try {
            clearUser()
            useCsrfStore().clearToken()
            // 必要に応じて他ストアの clear 呼び出しもここに
        } finally {
            global.setLoading(false)
        }
    }

    return {
        user,
        isLoggedIn,
        setUser,
        setDummyUser,
        clearUser,
        logout,
    }
})
