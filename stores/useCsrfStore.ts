import { endpoints } from "~/api/endpoints"
import { useAPI } from "~/composables/useAPI"

// Types
type CsrfTokenResponse = {
    csrfToken: string
    expiresAt: string
}

export const useCsrfStore = defineStore("csrf", () => {
    // State
    const token = ref<string>("")

    function getRememberToken(): string | null {
        return useCookie<string | null>("remember_token").value ?? null
    }

    // Actions
    function setToken(newToken: string): void {
        token.value = newToken
    }
    function clearToken(): void {
        token.value = ""
    }

    // Methods
    async function refresh(expiredToken?: string | null): Promise<boolean> {
        const { callApi } = useAPI()
        const rememberToken = getRememberToken()
        if (!rememberToken) return false

        try {
            const data = {
                expired_csrf_token: (expiredToken ?? token.value) || null,
                remember_token: rememberToken,
            }
            if (!data.remember_token) {
                return false
            }
            const res = await callApi<CsrfTokenResponse>({
                endpoint: endpoints.auth.csrfRefresh(),
                method: "POST",
                //onAuthError: 'throw',
                data,
            })
            if (res?.csrfToken) {
                token.value = res.csrfToken
                return true
            }
            return false
        } catch {
            return false
        }
    }

    async function bootstrap(): Promise<boolean> {
        if (token.value) return true
        if (!getRememberToken()) return false
        return await refresh(null)
    }

    async function ensureToken(): Promise<boolean> {
        if (token.value) return true
        return await bootstrap()
    }

    return {
        token,
        setToken,
        clearToken,
        refresh,
        bootstrap,
        ensureToken,
    }
})
