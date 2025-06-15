export const useGlobalStore = defineStore('global', () => {
    const isInitialized = ref<boolean>(false)
    const isLoading = ref<boolean>(false) // アプリ全体の代表ローディング

    function setInitialized(value: boolean) {
        isInitialized.value = value
    }

    function setLoading(value: boolean) {
        isLoading.value = value
    }

    return {
        isInitialized,
        isLoading,
        setInitialized,
        setLoading
    }
})
