import { useCsrfStore } from './useCsrfStore'
import { useGlobalStore } from './globalStore'

/** Types ( types/global.d.ts にて定義済みのため、ここでは参照のみ)
type User = {
    id: number // ユーザーID: ユーザー登録時に発行される insertId (シーケンシャル番号)
    name: string // ユーザー名（表示名）
    email: string // メールアドレス（=ログインID）
    avatar_url?: string | null // アバター画像URL（nullの場合はデフォルト画像を使用）
    roles?: string[] // ユーザーの役割（admin, userなど）
    plan?: string // ユーザープラン（free, proなど）
    plan_expiration?: string // プランの有効期限: YYYY-MM-DD形式の文字列
    language: string // ユーザーの言語設定（ja, enなど）
    theme: string // ユーザーのテーマ設定（light, darkなど）
    created_at: string // ユーザー登録日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    updated_at: string // ユーザー情報更新日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    last_login: string // 最終ログイン日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    last_login_ip?: string // 最終ログインIPアドレス: IPv4形式の文字列
    last_login_user_agent?: string // 最終ログインユーザーエージェント: ユーザーエージェント文字列
    is_deleted: boolean // ユーザーが削除されたかどうかのフラグ（論理削除用）
    is_verified: boolean // ユーザーがメールアドレスを確認したかどうかのフラグ（メール認証用）
    unread_notifications?: number[] // 未読通知数（通知IDの配列）
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
            avatar_url: null,
            //roles: ['user'],
            //plan: 'free',
            //plan_expiration: '2025-06-30',
            language: 'ja',
            theme: 'light',
            created_at: '2025-05-02T01:23:45',
            updated_at: '2025-05-02T01:23:45',
            last_login: '2025-05-10T04:56:12',
            //last_login_ip: '192.168.0.1',
            //last_login_user_agent: 'dummy-user-agent',
            is_deleted: false,
            is_verified: true,
            unread_notifications: [],
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
