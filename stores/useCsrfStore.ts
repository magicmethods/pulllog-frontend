export const useCsrfStore = defineStore('csrf', () => {
    // State
    const token = ref<string>('')

    // Actions
    function setToken(newToken: string): void {
        token.value = newToken
    }
    function clearToken(): void {
        token.value = ''
    }
    
    return {
        token,
        setToken,
        clearToken,
    }
})
