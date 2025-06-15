import { useUserStore } from '~/stores/useUserStore'
import { useCsrfStore } from '~/stores/useCsrfStore'
import { useGlobalStore } from '~/stores/globalStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'

export function useAuth() {
    const error = ref<string | null>(null)
    const isLoading = ref<boolean>(false) // ログイン処理のローディング状態（ログインボタン等での使用を想定）

    const { callApi } = useAPI()
    const userStore = useUserStore()
    const csrfStore = useCsrfStore()
    const globalStore = useGlobalStore()

    async function login(userid: string, password: string) {
        isLoading.value = true
        error.value = null

        try {
            const response: LoginResponse = await callApi({
                endpoint: endpoints.auth.login(),
                method: 'POST',
                data: { userid, password },
            })

            if (!response || !response.user) {
                throw new Error('ログインレスポンスが不正です')
            }
            if (response.user.is_deleted || !response.user.is_verified) {
                throw new Error('このアカウントは使用できません')
            }

            userStore.setUser(toUser(response.user))

            if (response.csrfToken) {
                csrfStore.setToken(response.csrfToken)
            }

            globalStore.setInitialized(true)
        } catch (err) {
            error.value = (err as Error).message
        } finally {
            isLoading.value = false
        }
    }

    async function logout() {
        await userStore.logout()
    }

    // Private Methods
    // ユーザーレスポンスをUser型に変換するヘルパー関数
    function toUser(ur: UserResponse): User {
        return {
            id: ur.id,
            name: ur.name,
            email: ur.email,
            avatarUrl: ur.avatar_url ?? null,
            roles: ur.roles ?? undefined,
            plan: ur.plan ?? undefined,
            planExpiration: ur.plan_expiration ?? undefined,
            language: ur.language,
            theme: ur.theme,
            createdAt: ur.created_at,
            updatedAt: ur.updated_at,
            lastLogin: ur.last_login,
        }
    }    

    return {
        login,
        logout,
        isLoading,
        error,
    }
}
