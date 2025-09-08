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

    // Actions
    function setToken(newToken: string): void {
        token.value = newToken
    }
    function clearToken(): void {
        token.value = ""
    }

    // Methods
    async function refresh(): Promise<boolean> {
        const { callApi } = useAPI()
        const rememberCookie = useCookie<string | null>("remember_token")
        // console.log('Calling CSRF refresh:', token.value, rememberCookie.value)
        if (!rememberCookie.value) return false

        try {
            const data = {
                expired_csrf_token: token.value || null,
                remember_token: rememberCookie.value || null,
            }
            if (!data.expired_csrf_token || !data.remember_token) {
                // CSRFトークンやremember_tokenがない場合
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

    return {
        token,
        setToken,
        clearToken,
        refresh,
    }
})
