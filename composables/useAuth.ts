import { useUserStore } from '~/stores/useUserStore'
import { useCsrfStore } from '~/stores/useCsrfStore'
import { useGlobalStore } from '~/stores/globalStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'

// Types
type LoginResponse = {
    user: User
    csrfToken: string | null
} | null

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

            userStore.setUser(response.user)

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

    return {
        login,
        logout,
        isLoading,
        error,
    }
}
