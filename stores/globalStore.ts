import { useAppStore } from '~/stores/useAppStore'

export const useGlobalStore = defineStore('global', () => {
    const isInitialized = ref<boolean>(false)
    const isLoading = ref<boolean>(false) // アプリ全体の代表ローディング

    function setInitialized(value: boolean) {
        isInitialized.value = value
        if (value) {
            // 初期化完了時にアプリケーションとユーザーストアを初期化
            const appStore = useAppStore()
            appStore.clearApp()
        }
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
