import { getCookie, setCookie, deleteCookie } from '~/utils/cookie'

export const useCsrfStore = defineStore('csrf', () => {
    // State
    const token = ref<string>('')

    // Actions
    function setToken(newToken: string): void {
        token.value = newToken
        setCookie('csrf_token', newToken)
    }
    function loadFromCookie(): void {
        const cookieToken = getCookie('csrf_token')
        if (cookieToken) token.value = cookieToken
    }
    function clearToken(): void {
        token.value = ''
        deleteCookie('csrf_token')
    }
    
    return {
        token,
        setToken,
        loadFromCookie,
        clearToken,
    }
})
