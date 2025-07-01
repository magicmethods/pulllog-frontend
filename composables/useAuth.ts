import { useUserStore } from '~/stores/useUserStore'
import { useCsrfStore } from '~/stores/useCsrfStore'
import { useGlobalStore } from '~/stores/globalStore'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'
import { toUser } from '~/utils/user'

export function useAuth() {
    const error = ref<string | null>(null)
    const isLoading = ref<boolean>(false) // ログイン処理のローディング状態（ログインボタン等での使用を想定）

    const { callApi } = useAPI()
    const userStore = useUserStore()
    const csrfStore = useCsrfStore()
    const globalStore = useGlobalStore()

    // Methods
    async function login(userid: string, password: string) {
        isLoading.value = true
        error.value = null

        try {
            const response: LoginResponse = await callApi({
                endpoint: endpoints.auth.login(),
                method: 'POST',
                data: { userid, password },
            })

            if (!response || !response.state || response.state !== 'success') {
                throw new Error(response?.message || 'ログインレスポンスが不正です')
            }
            if (!response.user || response.user.is_deleted || !response.user.is_verified) {
                throw new Error(response?.message || 'このアカウントは使用できません')
            }

            userStore.setUser(toUser(response.user))

            if (response.csrfToken) {
                csrfStore.setToken(response.csrfToken)
            }

            globalStore.setInitialized(true)
        } catch (err: unknown) {
            console.error('Login error:', err)
            error.value = err instanceof Error ? err.message : 'ログイン中にエラーが発生しました'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function register(name: string, email: string, password: string) {
        isLoading.value = true
        error.value = null

        try {
            const response: RegisterResponse = await callApi({
                endpoint: endpoints.auth.register(),
                method: 'POST',
                data: { name, email, password },
            })
            //console.log('Registration response:', response)

            if (!response || response.state !== 'success') {
                throw new Error(response?.message || '登録レスポンスが不正です')
            }

            globalStore.setInitialized(true)
        } catch (err: unknown) {
            console.error('Registration error:', err)
            error.value = (err as Error).message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function passwordReset(email: string) {
        isLoading.value = true
        error.value = null

        try {
            const response: PasswordResetResponse = await callApi({
                endpoint: endpoints.auth.password(),
                method: 'POST',
                data: { email },
            })

            if (!response || !response.success) {
                throw new Error(response?.message || 'パスワードリセットに失敗しました')
            }

            // 通常はメール送信後の処理なので、特にユーザーストアの更新は不要
            return response.message || 'パスワードリセットのメールを送信しました'
        } catch (err) {
            error.value = (err as Error).message
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function logout() {
        await userStore.logout()
    }
    
    return {
        login,
        register,
        passwordReset,
        logout,
        isLoading,
        error,
    }
}
