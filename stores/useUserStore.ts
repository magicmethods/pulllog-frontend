import { endpoints } from "~/api/endpoints"
//import { useI18n } from 'vue-i18n'
import { useAPI } from "~/composables/useAPI"
import { toUser } from "~/utils/user"
import { useGlobalStore } from "./globalStore"
import { useAppStore } from "./useAppStore"
import { useCsrfStore } from "./useCsrfStore"
import { useLogStore } from "./useLogStore"
import { useStatsStore } from "./useStatsStore"

export const useUserStore = defineStore("user", () => {
    // Composables
    const { callApi } = useAPI()

    // i18n
    //const { t } = useI18n()
    const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // state
    const user = ref<User | null>(null)
    const planLimits = ref<UserPlanLimits | null>(null)
    const isLoggedIn = computed(() => user.value !== null)

    // actions
    function setUser(u: User, limits?: UserPlanLimits | null) {
        user.value = u
        planLimits.value = limits ?? null
    }
    /*
    // デモ用（未使用）
    function setDemoUser(
        partialUserData?: Partial<User>,
        planLimitsData?: Partial<UserPlanLimits>
    ): void {
        const now = DateTime.now()
        const nowDateStr = now.toISO()
        const baseDemoUser: Partial<User> = {
            id: 2,
            name: 'Demo',
            email: 'demo@pulllog.net',
            avatarUrl: null,
            roles: ['user', 'demo'],
            plan: 'Demo',
            planExpiration: now.plus({ days: 1 }).toISODate(), // 1日間有効
            language: localStorage.getItem('language') ??  useConfig().defaultLocale,
            theme: localStorage.getItem('theme') || 'light',
            homePage: '/apps',
            createdAt: nowDateStr,
            updatedAt: nowDateStr,
            lastLogin: nowDateStr,
        }
        const baseDemoLimits: Partial<UserPlanLimits> = {
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
        const demoUser = { ...baseDemoUser, ...partialUserData } as User
        const demoLimits = { ...baseDemoLimits, ...planLimitsData } as UserPlanLimits
        setUser(demoUser, demoLimits)
    }
    */
    function hasUserRole(role: string): boolean {
        return user.value?.roles?.includes(role) ?? false
    }
    /**
     * ユーザーデータをクリア
     * - ユーザーデータをnullに設定
     * - プラン制限もnullに設定
     */
    function clearUser() {
        user.value = null
        planLimits.value = null
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
        if (!user.value) throw new Error(t("app.error.unknownUser"))

        try {
            let contentType: string | undefined
            // FormDataの場合はContent-Typeを設定しない
            if (data instanceof FormData) {
                contentType = undefined
            } else {
                contentType = "application/json"
            }

            // APIリクエスト
            const res: UserUpdateResponse = await callApi({
                endpoint: endpoints.user.update(),
                method: "PUT",
                data,
                // FormDataの時はcontent-typeをセットしない（fetchが自動で境界を付与）
                extraHeaders: contentType
                    ? { "content-type": contentType }
                    : {},
            })

            if (!res || res.state !== "success" || !res.user) {
                throw new Error(res?.message || t("app.error.userUpdateFailed"))
            }

            // レスポンスをUser型に変換してストアに反映
            user.value = { ...user.value, ...toUser(res.user) }
        } catch (err: unknown) {
            console.error("Failed to update user:", err)
            throw new Error(
                err instanceof Error
                    ? err.message
                    : t("app.error.userUpdateFailed"),
            )
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
     * - Rememberトークンを削除
     */
    async function logout() {
        const global = useGlobalStore()
        global.setLoading(true)
        try {
            // バックエンドAPIコールでサーバー側セッション消去
            try {
                const res = await callApi<VerifyResponse>({
                    endpoint: endpoints.auth.logout(),
                    method: "POST",
                })
                if (!res || !res.success) {
                    throw new Error(res?.message || t("app.error.logoutFailed"))
                }
            } catch (error: unknown) {
                // ここでエラーを投げると、ログアウト後の処理が行われないため、ログは出すが続行
                console.warn("Failed to remove server session:", error)
            } finally {
                // サーバーセッション削除の成否にかかわらずフロント側はログアウトさせる
                // フロント側状態のクリア
                clearUser()
                useCsrfStore().clearToken()
                const appStore = useAppStore()
                appStore.clearApp()
                appStore.clearAppList()
                useLogStore().clearLogs()
                useStatsStore().clearStatsCacheAll()
                // 既にあるRememberトークンのCookieを削除して自動ログインを無効化
                document.cookie =
                    "remember_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=lax"
            }
        } finally {
            global.setLoading(false)
        }
    }
    /** ログインは useAuth.ts コンポーザブルで実装 */
    /**
     * ユーザー削除処理
     * - バックエンドAPIを呼び出してユーザーを削除
     * - ユーザーデータをクリア
     * @throws {Error} - ユーザー削除に失敗した場合
     */
    async function deleteUser() {
        if (!user.value) throw new Error(t("app.error.unknownUser"))

        const global = useGlobalStore()
        global.setLoading(true)
        try {
            // APIリクエスト
            const res: UserDeleteResponse = await callApi({
                endpoint: endpoints.user.delete(),
                method: "DELETE",
            })

            if (!res || res.state !== "success") {
                throw new Error(res?.message || t("app.error.userDeleteFailed"))
            }

            // ユーザーデータおよび関連データをクリア
            clearUser()
            useCsrfStore().clearToken()
            const appStore = useAppStore()
            appStore.clearApp()
            appStore.clearAppList()
            useLogStore().clearLogs()
            useStatsStore().clearStatsCacheAll()
            // トップページにリダイレクト
            useRouter().push("/")
        } catch (err: unknown) {
            console.error("Failed to delete user:", err)
            throw new Error(
                err instanceof Error
                    ? err.message
                    : t("app.error.userDeleteFailed"),
            )
        } finally {
            global.setLoading(false)
        }
    }

    return {
        user,
        planLimits,
        isLoggedIn,
        setUser,
        hasUserRole,
        clearUser,
        updateUser,
        logout,
        deleteUser,
    }
})
