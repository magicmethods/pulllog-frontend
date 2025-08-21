import { useUserStore } from '~/stores/useUserStore'
import { useCsrfStore } from '~/stores/useCsrfStore'
import { useGlobalStore } from '~/stores/globalStore'
import { useCurrencyStore } from '~/stores/useCurrencyStore'
import { useI18n } from 'vue-i18n'
import { useAPI } from '~/composables/useAPI'
import { endpoints } from '~/api/endpoints'
import { toUser, toUserPlanLimits } from '~/utils/user'

export function useAuth() {
    const error = ref<string | null>(null)
    const isLoading = ref<boolean>(false) // ログイン処理のローディング状態（ログインボタン等での使用を想定）

    const appConfig = useConfig() // アプリケーションの設定を取得
    const { callApi } = useAPI()
    const userStore = useUserStore()
    const csrfStore = useCsrfStore()
    const globalStore = useGlobalStore()
    const { t, locale } = useI18n()
    //const t = (key: string | number) => useNuxtApp().$i18n.t(key)

    // Methods
    async function login(email: string, password: string, remember = false) {
        isLoading.value = true
        error.value = null

        try {
            const response: LoginResponse = await callApi({
                endpoint: endpoints.auth.login(),
                method: 'POST',
                data: { email, password, remember },
            })

            await afterLogin(response)
        } catch (err: unknown) {
            console.error('Login error:', err)
            error.value = err instanceof Error ? err.message : t('auth.login.error')
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function autoLogin() {
        isLoading.value = true
        error.value = null

        try {
            const response: LoginResponse = await callApi({
                endpoint: endpoints.auth.autoLogin(),
                method: 'POST', // Cookieはリクエストヘッダに付与され送信される
            })

            await afterLogin(response)
        } catch (err: unknown) {
            //console.error('Auto-login error:', err)
            error.value = err instanceof Error ? err.message : t('auth.login.error')
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function demoLogin() {
        isLoading.value = true
        error.value = null

        try {
            const response: LoginResponse = await callApi({
                endpoint: endpoints.auth.demoLogin(),
                method: 'POST',
            })

            await afterLogin(response)

            await navigateTo('/apps', { replace: true })
        } catch (err: unknown) {
            console.error('Demo login error:', err)
            error.value = err instanceof Error ? err.message : t('auth.login.error')
            throw err
        } finally {
            //isLoading.value = false
        }
    }

    async function register(name: string, email: string, password: string) {
        isLoading.value = true
        error.value = null
        const language = locale.value || appConfig.defaultLocale // デフォルト言語を設定

        try {
            const response: RegisterResponse = await callApi({
                endpoint: endpoints.auth.register(),
                method: 'POST',
                data: { name, email, password, language },
            })
            //console.log('Registration response:', response)

            if (!response || response.state !== 'success') {
                throw new Error(response?.message || t('auth.register.invalidResponse'))
            }

            globalStore.setInitialized(true)
        } catch (err: unknown) {
            console.error('Registration error:', err)
            error.value = err instanceof Error ? err.message : t('auth.register.error')
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
                throw new Error(response?.message || t('auth.passwordReset.error'))
            }

            return response.message || t('auth.passwordReset.success')
        } catch (err: unknown) {
            console.error('Password reset error:', err)
            error.value = err instanceof Error ? err.message : t('auth.passwordReset.error')
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function verifyToken(token: string, type: 'signup' | 'reset'): Promise<boolean> {
        isLoading.value = true
        error.value = null

        try {
            const response: VerifyResponse | null = await callApi({
                endpoint: endpoints.auth.verify(),
                method: 'POST',
                data: { token, type },
            })

            if (!response || !response.success) {
                throw new Error(response?.message || t('auth.verify.error'))
            }

            return response.success
        } catch (err: unknown) {
            console.error('Token verification error:', err)
            error.value = err instanceof Error ? err.message : t('auth.verify.error')
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function updatePassword(
        token: string,
        type: 'signup' | 'reset',
        code: string,
        password: string
    ): Promise<boolean> {
        isLoading.value = true
        error.value = null

        try {
            const response: VerifyResponse | null = await callApi({
                endpoint: endpoints.auth.updatePassword(),
                method: 'PUT',
                data: { token, type, code, password },
            })

            if (!response || !response.success) {
                throw new Error(response?.message || t('auth.updatePassword.error'))
            }

            return response.success
        } catch (err: unknown) {
            console.error('Update password error:', err)
            error.value = err instanceof Error ? err.message : t('auth.updatePassword.error')
            throw err
        } finally {
            isLoading.value = false
        }
    }

    async function logout() {
        await userStore.logout()
    }

    // Private methods
    async function afterLogin(response: LoginResponse): Promise<void> {
        if (!response || !response.state || response.state !== 'success') {
            throw new Error(response?.message || t('auth.login.invalidResponse'))
        }
        if (!response.user || response.user.is_deleted || !response.user.is_verified) {
            throw new Error(response?.message || t('auth.login.accountNotAvailable'))
        }

        userStore.setUser(
            toUser(response.user),
            toUserPlanLimits(response.user)
        )

        if (response.csrfToken) {
            csrfStore.setToken(response.csrfToken)
        }

        //console.log('Remember token in login:', response.rememberToken, response.rememberTokenExpires)
        if (response.rememberToken && response.rememberTokenExpires) {
            // RememberトークンをCookieにセット
            document.cookie = `remember_token=${response.rememberToken}; expires=${new Date(response.rememberTokenExpires).toUTCString()}; path=/; secure; samesite=lax`
        } else {
            // 既にあるRememberトークンのCookieを削除
            document.cookie = 'remember_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=lax'
        }

        // 通貨データをロード
        const currencyStore = useCurrencyStore()
        currencyStore.ensureLoaded().catch(() => {}) // ノンブロッキング

        globalStore.setInitialized(true)
    }

    return {
        login,
        autoLogin,
        demoLogin,
        register,
        passwordReset,
        verifyToken,
        updatePassword,
        logout,
        isLoading,
        error,
    }
}
