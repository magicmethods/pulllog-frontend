import { useCsrfStore } from './useCsrfStore'
import { useGlobalStore } from './globalStore'
import { endpoints } from '~/api/endpoints'
import { toUser } from '~/utils/user'

/** Types ( types/user.d.ts にて定義済みの内容を参考用にコメントアウト)
type User = {
    id?: number // 将来的に必要なら使用
    name: string // ユーザー名（表示名）
    email: string // メールアドレス（=ログインID）
    password?: string // ログインパスワード（パスワード更新時のみ新規パスワードが入る）
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
type UserResponse = {
    id: number // ユーザーID: ユーザー登録時に発行される insertId (シーケンシャル番号)
    name: string
    email: string
    avatar_url?: string | null // アバター画像URL
    roles?: string[] // ユーザーの役割（admin, userなど）
    plan?: string // ユーザープラン（free, proなど）
    plan_expiration?: string // プランの有効期限: YYYY-MM-DD形式の文字列
    language: string // ユーザーの言語設定
    theme: string // ユーザーのテーマ設定
    home_page?: string // ログイン後に表示されるページ
    created_at: string // ユーザー登録日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    updated_at: string // ユーザー情報更新日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    last_login: string // 最終ログイン日時: YYYY-MM-DDTHH:mm:ss形式の文字列（DB登録時に発行される DATETIME 文字列）
    last_login_ip?: string // 最終ログインIPアドレス: IPv4形式の文字列
    last_login_user_agent?: string // 最終ログインユーザーエージェント: ユーザーエージェント文字列
    is_deleted: boolean // ユーザーが削除されたかどうかのフラグ（論理削除用）
    is_verified: boolean // ユーザーがメールアドレスを確認したかどうかのフラグ（メール認証用）
    unread_notifications?: number[] // 未読通知数（通知IDの配列）
    [key: string]: unknown
}
type LoginResponse = {
    user: UserResponse
    csrfToken: string | null
} | null
*/

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
     * @param data 更新するユーザー情報（部分的でもOK）
     * @returns Promise<void>
     * @throws Error - ユーザー情報の更新に失敗した場合
     */
    async function updateUser(data: Partial<User>): Promise<void> {
        if (!user.value) throw new Error('ログインユーザーが不明です')
        try {
            // APIリクエスト
            const res: UserResponse | null = await callApi({
                endpoint: endpoints.user.update(),
                method: 'PUT',
                data,
            })
            if (!res || typeof res !== 'object') {
                throw new Error('ユーザー情報の更新に失敗しました')
            }
            // レスポンスをUser型に変換してストアに反映
            user.value = { ...user.value, ...toUser(res) }
        } catch (
            // biome-ignore lint:/suspicious/noExplicitAny
            err: any
        ) {
            // 必要に応じてエラー加工
            throw err
        }
    }
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
        updateUser,
        logout,
    }
})
